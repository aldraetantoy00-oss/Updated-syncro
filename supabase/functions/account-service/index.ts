import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import bcrypt from "npm:bcryptjs@2.4.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const tokenSecret = Deno.env.get("AUTH_TOKEN_SECRET")!;
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeRole(role: unknown) {
  const normalized = String(role || "org").trim().replace(/[\s-]+/g, "_").toUpperCase();
  return normalized === "ORG" || normalized === "ORGANISATION" ? "ORGANIZATION" : normalized;
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - base64.length % 4) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function signToken(user: Record<string, any>) {
  const payload = toBase64Url(new TextEncoder().encode(JSON.stringify({
    sub: String(user.id),
    role: normalizeRole(user.role),
    exp: Date.now() + 12 * 60 * 60 * 1000,
  })));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(tokenSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
  return `${payload}.${toBase64Url(signature)}`;
}

async function getTokenPayload(request: Request) {
  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(tokenSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    fromBase64Url(signature),
    new TextEncoder().encode(payload),
  );
  if (!valid) return null;
  try {
    const decoded = JSON.parse(new TextDecoder().decode(fromBase64Url(payload)));
    return decoded.exp > Date.now() ? decoded : null;
  } catch {
    return null;
  }
}

function verifyPassword(password: string, stored: string) {
  if (!stored) return false;
  const hash = stored.startsWith("$2y$") ? stored.replace(/^\$2y\$/, "$2a$") : stored;
  return /^\$2[aby]\$/.test(hash) ? bcrypt.compareSync(password, hash) : password === stored;
}

function publicUser(user: Record<string, any>) {
  return {
    id: user.id,
    name: user.name || null,
    profile_name: user.profile_name || user.name || null,
    username: user.username || user.name || null,
    email: user.email,
    role: normalizeRole(user.role),
    department_id: user.department_id || null,
    profile_photo_path: user.profile_photo_path || null,
    avatar_url: user.profile_photo_path || null,
    account_status: user.account_status || null,
    created_at: user.created_at || null,
    is_approved: user.is_approved === true,
  };
}

async function handleAction(action: string, body: Record<string, any>, request: Request) {
  if (action === "requestAccount") {
    const name = String(body.name || "").trim();
    const username = String(body.username || "").trim().toLowerCase();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const departmentId = Number(body.department_id);
    if (!name || !username || !email || !password || !Number.isInteger(departmentId)) {
      return jsonResponse({ error: "all_fields_required" }, 400);
    }
    if (!/^[a-z0-9._-]{3,30}$/.test(username)) return jsonResponse({ error: "invalid_username" }, 400);
    if (password.length < 6) return jsonResponse({ error: "password_too_short" }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonResponse({ error: "invalid_email" }, 400);

    const { data: department, error: departmentError } = await supabase
      .from("departments")
      .select("id")
      .eq("id", departmentId)
      .maybeSingle();
    if (departmentError || !department) return jsonResponse({ error: "invalid_department" }, 400);

    const { data, error } = await supabase.from("users").insert({
      name: username,
      profile_name: name,
      username,
      email,
      password: await bcrypt.hash(password, 12),
      role: "org",
      department_id: departmentId,
      account_status: "pending",
      is_approved: false,
    }).select("id").single();
    if (error?.code === "23505") return jsonResponse({ error: "email_or_username_exists" }, 409);
    if (error) throw error;
    return jsonResponse({ requestId: data.id }, 201);
  }

  if (action === "verifyLogin") {
    const login = String(body.login || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!login || !password) return jsonResponse({ error: "login_and_password_required" }, 400);
    const fields = "id,name,profile_name,username,email,password,role,department_id,profile_photo_path,account_status,is_approved,created_at";
    let { data: user, error } = await supabase.from("users").select(fields).eq("email", login).maybeSingle();
    if (!user && !error) {
      ({ data: user, error } = await supabase.from("users").select(fields).eq("username", login).maybeSingle());
    }
    if (!user && !error) {
      ({ data: user, error } = await supabase.from("users").select(fields).eq("name", login).maybeSingle());
    }
    if (error) throw error;
    if (!user || !verifyPassword(password, user.password)) return jsonResponse({ error: "invalid_credentials" }, 401);
    if (user.is_approved !== true && user.account_status !== "approved") {
      return jsonResponse({ error: "pending_approval", message: "Your account request is awaiting administrator approval." }, 403);
    }
    return jsonResponse({ user: publicUser(user), accessToken: await signToken(user) });
  }

  if (action === "getAccountRequests" || action === "approveAccountRequest") {
    const token = await getTokenPayload(request);
    if (!token || !["ADMIN", "SUPER_ADMIN"].includes(token.role)) return jsonResponse({ error: "admin_required" }, 403);
    if (action === "getAccountRequests") {
      const { data, error } = await supabase.from("users")
        .select("id,name,profile_name,username,email,department_id,account_status,created_at")
        .eq("account_status", "pending")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return jsonResponse({ requests: data });
    }
    const userId = body.userId;
    if (!userId) return jsonResponse({ error: "user_id_required" }, 400);
    const requestedRole = String(body.role || "org").trim().toLowerCase();
    if (!["org", "department"].includes(requestedRole)) {
      return jsonResponse({ error: "invalid_account_role" }, 400);
    }
    const { data, error } = await supabase.from("users")
      .update({ role: requestedRole, account_status: "approved", is_approved: true })
      .eq("id", userId)
      .eq("account_status", "pending")
      .select("id")
      .maybeSingle();
    if (error) throw error;
    return jsonResponse({ approved: !!data });
  }

  if (action === "getSubmissions") {
    const token = await getTokenPayload(request);
    if (!token) return jsonResponse({ error: "session_expired" }, 401);

    const { data: user, error: userError } = await supabase.from("users")
      .select("id,role,account_status,is_approved")
      .eq("id", token.sub)
      .maybeSingle();
    if (userError) throw userError;
    if (!user || (user.is_approved !== true && user.account_status !== "approved")) {
      return jsonResponse({ error: "account_not_approved" }, 403);
    }

    const role = normalizeRole(user.role);
    let query = supabase.from("submissions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (["PAIR", "PAIR_STAFF", "ADMIN", "SUPER_ADMIN"].includes(role)) {
      // Review roles may access the organization-wide queue.
    } else if (["ORG", "ORGANIZATION", "ORGANISATION", "DEPARTMENT", "CREATOR"].includes(role)) {
      query = query.eq("user_id", user.id);
    } else {
      return jsonResponse({ error: "submissions_access_denied" }, 403);
    }

    const { data, error } = await query;
    if (error) throw error;

    const submissions = data || [];
    if (["PAIR", "PAIR_STAFF", "ADMIN", "SUPER_ADMIN"].includes(role) && submissions.length) {
      const organizationIds = [...new Set(
        submissions
          .map((submission) => submission.user_id)
          .filter((userId) => userId !== null && userId !== undefined),
      )];
      if (organizationIds.length) {
        const { data: organizations, error: organizationsError } = await supabase.from("users")
          .select("id,name,profile_name")
          .in("id", organizationIds);
        if (organizationsError) throw organizationsError;

        const namesById = new Map(
          (organizations || []).map((organization) => [
            String(organization.id),
            organization.profile_name || organization.name || null,
          ]),
        );
        return jsonResponse({
          submissions: submissions.map((submission) => ({
            ...submission,
            org_name: submission.org_name || namesById.get(String(submission.user_id)) || null,
          })),
        });
      }
    }

    return jsonResponse({ submissions });
  }

  if (action === "getDepartmentOrganizations") {
    const token = await getTokenPayload(request);
    if (!token) return jsonResponse({ error: "session_expired" }, 401);

    const { data: departmentUser, error: departmentUserError } = await supabase.from("users")
      .select("id,role,department_id,account_status,is_approved")
      .eq("id", token.sub)
      .maybeSingle();
    if (departmentUserError) throw departmentUserError;
    if (!departmentUser || (departmentUser.is_approved !== true && departmentUser.account_status !== "approved")) {
      return jsonResponse({ error: "account_not_approved" }, 403);
    }
    if (normalizeRole(departmentUser.role) !== "DEPARTMENT") {
      return jsonResponse({ error: "department_required" }, 403);
    }
    if (departmentUser.department_id === null || departmentUser.department_id === undefined) {
      return jsonResponse({ error: "department_not_assigned" }, 400);
    }

    const { data: organizations, error: organizationsError } = await supabase.from("users")
      .select("id,profile_name,name,username,email,department_id")
      .eq("department_id", departmentUser.department_id)
      .in("role", ["org", "ORG", "organization", "ORGANIZATION", "creator", "CREATOR"])
      .or("is_approved.eq.true,account_status.eq.approved")
      .order("profile_name", { ascending: true });
    if (organizationsError) throw organizationsError;

    const organizationList = organizations || [];
    const organizationIds = organizationList.map((organization) => organization.id);
    if (!organizationIds.length) return jsonResponse({ organizations: [] });

    const { data: submissions, error: submissionsError } = await supabase.from("submissions")
      .select("id,user_id,original_caption,enhanced_caption,status,workflow_status,created_at,reviewed_at,posted_at")
      .in("user_id", organizationIds)
      .order("created_at", { ascending: false })
      .limit(1000);
    if (submissionsError) throw submissionsError;

    const namesById = new Map(
      organizationList.map((organization) => [
        String(organization.id),
        organization.profile_name || organization.name || organization.username || null,
      ]),
    );
    const submissionsByOrganization = new Map<string, Record<string, any>[]>();
    for (const submission of submissions || []) {
      const key = String(submission.user_id);
      const organizationSubmissions = submissionsByOrganization.get(key) || [];
      organizationSubmissions.push({
        ...submission,
        org_name: namesById.get(key) || null,
      });
      submissionsByOrganization.set(key, organizationSubmissions);
    }

    return jsonResponse({
      organizations: organizationList.map((organization) => ({
        ...organization,
        submissions: submissionsByOrganization.get(String(organization.id)) || [],
      })),
    });
  }

  if (action === "reviewDepartmentSubmission") {
    const token = await getTokenPayload(request);
    if (!token) return jsonResponse({ error: "session_expired" }, 401);

    const { data: departmentUser, error: departmentUserError } = await supabase.from("users")
      .select("id,role,department_id,account_status,is_approved")
      .eq("id", token.sub)
      .maybeSingle();
    if (departmentUserError) throw departmentUserError;
    if (!departmentUser || (departmentUser.is_approved !== true && departmentUser.account_status !== "approved")) {
      return jsonResponse({ error: "account_not_approved" }, 403);
    }
    if (normalizeRole(departmentUser.role) !== "DEPARTMENT") {
      return jsonResponse({ error: "department_required" }, 403);
    }
    if (departmentUser.department_id === null || departmentUser.department_id === undefined) {
      return jsonResponse({ error: "department_not_assigned" }, 400);
    }

    const submissionId = body.submissionId;
    const decision = String(body.decision || "approved").toLowerCase();
    const enhancedCaption = String(body.enhancedCaption || "").trim();
    const feedback = String(body.feedback || "").trim();
    if (submissionId === null || submissionId === undefined || submissionId === "") {
      return jsonResponse({ error: "submission_id_required" }, 400);
    }
    if (!["approved", "rejected"].includes(decision)) {
      return jsonResponse({ error: "invalid_department_decision" }, 400);
    }
    if (decision === "approved" && enhancedCaption.length < 10) {
      return jsonResponse({ error: "enhanced_caption_too_short" }, 400);
    }
    if (enhancedCaption.length > 10000 || feedback.length > 5000) {
      return jsonResponse({ error: "review_text_too_long" }, 400);
    }

    const { data: submission, error: submissionError } = await supabase.from("submissions")
      .select("id,user_id,status,workflow_status,submission_target")
      .eq("id", submissionId)
      .maybeSingle();
    if (submissionError) throw submissionError;
    if (!submission) return jsonResponse({ error: "submission_not_found" }, 404);

    const { data: organization, error: organizationError } = await supabase.from("users")
      .select("id,role,department_id,account_status,is_approved")
      .eq("id", submission.user_id)
      .maybeSingle();
    if (organizationError) throw organizationError;
    if (
      !organization ||
      String(organization.department_id) !== String(departmentUser.department_id) ||
      submission.submission_target !== "department" ||
      !["ORG", "ORGANIZATION", "ORGANISATION", "CREATOR"].includes(normalizeRole(organization.role)) ||
      (organization.is_approved !== true && organization.account_status !== "approved")
    ) {
      return jsonResponse({ error: "submission_access_denied" }, 403);
    }

    const currentStatus = String(submission.workflow_status || submission.status || "").toLowerCase();
    if (["approved", "completed", "posted"].includes(currentStatus)) {
      return jsonResponse({ error: "submission_already_reviewed" }, 409);
    }

    const updates: Record<string, unknown> = {
      pair_feedback: feedback || null,
      status: decision === "rejected" ? "pending" : "approved",
      workflow_status: decision,
      reviewed_at: new Date().toISOString(),
    };
    if (decision === "approved") updates.enhanced_caption = enhancedCaption;

    const { data: updatedSubmission, error: updateError } = await supabase.from("submissions")
      .update(updates)
      .eq("id", submission.id)
      .select("id,status,workflow_status")
      .single();
    if (updateError) throw updateError;

    return jsonResponse({ submission: updatedSubmission });
  }

  if (action === "getNotifications") {
    const token = await getTokenPayload(request);
    if (!token) return jsonResponse({ error: "session_expired" }, 401);

    const { data: user, error: userError } = await supabase.from("users")
      .select("id,account_status,is_approved")
      .eq("id", token.sub)
      .maybeSingle();
    if (userError) throw userError;
    if (!user || (user.is_approved !== true && user.account_status !== "approved")) {
      return jsonResponse({ error: "account_not_approved" }, 403);
    }

    const { data, error } = await supabase.from("notifications")
      .select("*")
      .eq("notifiable_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw error;
    return jsonResponse({ notifications: data || [] });
  }

  if (action === "notifySubmissionCreated" || action === "notifySubmissionStatus") {
    const token = await getTokenPayload(request);
    if (!token) return jsonResponse({ error: "session_expired" }, 401);

    const { data: user, error: userError } = await supabase.from("users")
      .select("id,role,department_id,account_status,is_approved")
      .eq("id", token.sub)
      .maybeSingle();
    if (userError) throw userError;
    if (!user || (user.is_approved !== true && user.account_status !== "approved")) {
      return jsonResponse({ error: "account_not_approved" }, 403);
    }

    const submissionId = body.submissionId;
    if (submissionId === null || submissionId === undefined || submissionId === "") {
      return jsonResponse({ error: "submission_id_required" }, 400);
    }
    const { data: submission, error: submissionError } = await supabase.from("submissions")
      .select("id,user_id,status,workflow_status,submission_target")
      .eq("id", submissionId)
      .maybeSingle();
    if (submissionError) throw submissionError;
    if (!submission) return jsonResponse({ error: "submission_not_found" }, 404);

    const role = normalizeRole(user.role);
    let recipients: Array<string | number> = [];
    let notificationType = "";
    let title = "";
    let message = "";

    if (action === "notifySubmissionCreated") {
      if (!["ORG", "ORGANIZATION", "ORGANISATION", "DEPARTMENT", "CREATOR"].includes(role)) {
        return jsonResponse({ error: "organization_required" }, 403);
      }
      if (String(submission.user_id) !== String(user.id)) {
        return jsonResponse({ error: "submission_access_denied" }, 403);
      }

      const { data: users, error: reviewersError } = await supabase.from("users")
        .select("id,role,account_status,is_approved")
        .in("role", ["PAIR", "PAIR_STAFF", "PAIR STAFF", "PAIR-STAFF", "pair", "pair_staff", "pair staff", "pair-staff"])
        .or("is_approved.eq.true,account_status.eq.approved");
      if (reviewersError) throw reviewersError;
      recipients = (users || [])
        .filter((reviewer) =>
          ["PAIR", "PAIR_STAFF"].includes(normalizeRole(reviewer.role)) &&
          (reviewer.is_approved === true || reviewer.account_status === "approved")
        )
        .map((reviewer) => reviewer.id);

      const { data: organization, error: organizationError } = await supabase.from("users")
        .select("department_id,role")
        .eq("id", user.id)
        .maybeSingle();
      if (organizationError) throw organizationError;
      if (
        submission.submission_target === "department" &&
        normalizeRole(organization?.role) !== "DEPARTMENT" &&
        organization?.department_id !== null &&
        organization?.department_id !== undefined
      ) {
        const { data: departments, error: departmentsError } = await supabase.from("users")
          .select("id,role,account_status,is_approved,department_id")
          .eq("department_id", organization.department_id)
          .in("role", ["department", "DEPARTMENT"])
          .or("is_approved.eq.true,account_status.eq.approved");
        if (departmentsError) throw departmentsError;
        const departmentRecipients = (departments || [])
          .filter((department) =>
            normalizeRole(department.role) === "DEPARTMENT" &&
            (department.is_approved === true || department.account_status === "approved")
          )
          .map((department) => department.id);
        recipients = [...new Set([...recipients, ...departmentRecipients])];
      }

      notificationType = "App\\Notifications\\SubmissionQueuedForReview";
      title = "New submission to review";
      message = "A new submission was added to the review queue.";
    } else {
      const decision = String(body.decision || "");
      const departmentReview = role === "DEPARTMENT" && ["approved", "rejected"].includes(decision);
      if (!departmentReview && !["PAIR", "PAIR_STAFF", "ADMIN", "SUPER_ADMIN"].includes(role)) {
        return jsonResponse({ error: "reviewer_required" }, 403);
      }
      const notifications: Record<string, { type: string; title: string; message: string }> = {
        approved: {
          type: "App\\Notifications\\SubmissionApproved",
          title: "Submission Approved",
          message: "Your submission was approved by PAIR!",
        },
        rejected: {
          type: "App\\Notifications\\SubmissionRejected",
          title: "Submission Rejected",
          message: "Your submission needs revisions. Please check feedback.",
        },
        posted: {
          type: "App\\Notifications\\SubmissionPosted",
          title: "Submission Posted",
          message: "Your submission has been posted!",
        },
      };
      const notification = notifications[decision];
      if (!notification) return jsonResponse({ error: "invalid_submission_decision" }, 400);
      if (role === "DEPARTMENT" && ["approved", "rejected"].includes(decision)) {
        const { data: organization, error: organizationError } = await supabase.from("users")
          .select("id,department_id,role")
          .eq("id", submission.user_id)
          .maybeSingle();
        if (organizationError) throw organizationError;
        if (
          !user.department_id ||
          !organization ||
          String(organization.department_id) !== String(user.department_id) ||
          !["ORG", "ORGANIZATION", "ORGANISATION", "CREATOR"].includes(normalizeRole(organization.role))
        ) {
          return jsonResponse({ error: "submission_access_denied" }, 403);
        }
      }
      if (![submission.status, submission.workflow_status].some((status) => String(status || "").toLowerCase() === decision)) {
        return jsonResponse({ error: "submission_status_not_updated" }, 409);
      }
      recipients = submission.user_id === null || submission.user_id === undefined ? [] : [submission.user_id];
      notificationType = notification.type;
      title = notification.title;
      message = role === "DEPARTMENT"
        ? decision === "rejected"
          ? "Your submission needs revisions. Please check the department feedback."
          : "Your submission was approved by your department."
        : notification.message;
    }

    if (recipients.length === 0) return jsonResponse({ created: 0 });

    const now = new Date().toISOString();
    const { error: insertError } = await supabase.from("notifications").insert(
      recipients.map((recipientId) => ({
        id: crypto.randomUUID(),
        type: notificationType,
        notifiable_type: "App\\Models\\User",
        notifiable_id: recipientId,
        data: JSON.stringify({ title, message, submission_id: submission.id }),
        created_at: now,
        updated_at: now,
      })),
    );
    if (insertError) throw insertError;
    return jsonResponse({ created: recipients.length });
  }

  if (action === "updateProfile") {
    const token = await getTokenPayload(request);
    if (!token) return jsonResponse({ error: "session_expired" }, 401);

    const profileName = String(body.profileName || "").trim();
    const username = String(body.username || "").trim().toLowerCase();
    const email = String(body.email || "").trim().toLowerCase();
    if (!profileName || !username || !email) return jsonResponse({ error: "profile_fields_required" }, 400);
    if (!/^[a-z0-9._-]{3,30}$/.test(username)) return jsonResponse({ error: "invalid_username" }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonResponse({ error: "invalid_email" }, 400);

    const { data: currentUser, error: currentUserError } = await supabase.from("users")
      .select("id,email,profile_photo_path,account_status,is_approved")
      .eq("id", token.sub)
      .maybeSingle();
    if (currentUserError) throw currentUserError;
    if (!currentUser || (currentUser.is_approved !== true && currentUser.account_status !== "approved")) {
      return jsonResponse({ error: "account_not_approved" }, 403);
    }

    const updates: Record<string, unknown> = {
      profile_name: profileName,
      name: username,
      username,
      email,
    };
    if (email !== String(currentUser.email).toLowerCase()) updates.email_verified_at = null;

    const avatarBase64 = String(body.avatarBase64 || "");
    const avatarContentType = String(body.avatarContentType || "");
    if (avatarBase64) {
      const extensions: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/gif": "gif",
        "image/webp": "webp",
      };
      const extension = extensions[avatarContentType];
      if (!extension || avatarBase64.length > 2_900_000) {
        return jsonResponse({ error: "invalid_profile_photo" }, 400);
      }
      const binary = atob(avatarBase64);
      if (binary.length > 2 * 1024 * 1024) return jsonResponse({ error: "profile_photo_too_large" }, 400);
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      const photoPath = `${token.sub}/profile.${extension}`;
      const { error: uploadError } = await supabase.storage.from("profile-photos").upload(photoPath, bytes, {
        contentType: avatarContentType,
        upsert: true,
      });
      if (uploadError) throw uploadError;
      const { data: publicUrl } = supabase.storage.from("profile-photos").getPublicUrl(photoPath);
      updates.profile_photo_path = publicUrl.publicUrl;
    }

    const { data: updatedUser, error: updateError } = await supabase.from("users")
      .update(updates)
      .eq("id", token.sub)
      .select("id,name,profile_name,username,email,role,department_id,profile_photo_path,account_status,is_approved,created_at")
      .single();
    if (updateError?.code === "23505") return jsonResponse({ error: "username_or_email_exists" }, 409);
    if (updateError) throw updateError;
    return jsonResponse({ user: publicUser(updatedUser) });
  }

  if (action === "changePassword") {
    const token = await getTokenPayload(request);
    if (!token) return jsonResponse({ error: "session_expired" }, 401);
    const currentPassword = String(body.currentPassword || "");
    const newPassword = String(body.newPassword || "");
    if (!currentPassword || newPassword.length < 8) return jsonResponse({ error: "password_requirements_not_met" }, 400);
    const { data: user, error: readError } = await supabase.from("users")
      .select("id,password,account_status,is_approved")
      .eq("id", token.sub)
      .maybeSingle();
    if (readError) throw readError;
    if (!user || (user.is_approved !== true && user.account_status !== "approved") || !verifyPassword(currentPassword, user.password)) {
      return jsonResponse({ error: "current_password_incorrect" }, 401);
    }
    const { error } = await supabase.from("users")
      .update({ password: await bcrypt.hash(newPassword, 12) })
      .eq("id", token.sub)
      .eq("account_status", "approved");
    if (error) throw error;
    return jsonResponse({ success: true });
  }

  if (action === "generateCaption") {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return jsonResponse({ error: "caption_service_not_configured" }, 500);
    const text = String(body.text || "").trim();
    if (!text) return jsonResponse({ error: "text_required" }, 400);
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: `Create a social media caption for: ${text}` }],
      }),
    });
    const result = await response.json();
    if (!response.ok) return jsonResponse({ error: "caption_provider_failed" }, 502);
    return jsonResponse({ caption: result.choices?.[0]?.message?.content || "" });
  }

  return jsonResponse({ error: "unknown_action" }, 404);
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);
  try {
    const body = await request.json();
    return await handleAction(String(body.action || ""), body, request);
  } catch (error) {
    console.error("account-service error", error);
    return jsonResponse({ error: "service_unavailable" }, 500);
  }
});