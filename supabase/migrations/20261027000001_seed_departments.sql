UPDATE public.departments AS current_department
SET department_name = 'School of Art and Sciences'
WHERE lower(btrim(current_department.department_name)) = 'school of arts and sciences'
  AND NOT EXISTS (
    SELECT 1
    FROM public.departments AS existing_department
    WHERE lower(btrim(existing_department.department_name)) = 'school of art and sciences'
      AND existing_department.id <> current_department.id
  );

INSERT INTO public.departments (department_name, department_short_name)
SELECT school.department_name, school.department_short_name
FROM (VALUES
  ('School of Law', 'SOL'),
  ('School of Commerce', 'SCOM')
) AS school(department_name, department_short_name)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.departments AS existing_department
  WHERE lower(btrim(existing_department.department_name)) = lower(school.department_name)
);