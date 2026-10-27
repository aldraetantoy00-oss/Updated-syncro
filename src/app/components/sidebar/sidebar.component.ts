import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { IonicModule, MenuController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../services/supabase';
import { AuthRoleService } from '../../services/auth-role.service';

@Component({
	selector: 'app-sidebar',
	templateUrl: './sidebar.component.html',
	styleUrls: ['./sidebar.component.scss'],
	standalone: true,
	exportAs: 'sidebar',
	imports: [IonicModule, RouterModule, CommonModule]
})
export class SidebarComponent {
	fullName = '';
	email = '';
	avatarUrl = '';
	loading = false;
	isPair = false;
	isAdmin = false;

	constructor(
		private supabaseService: SupabaseService,
		private authRole: AuthRoleService,
		private router: Router,
		private menu: MenuController
	) {}

	// Called when menu opens
	async onMenuOpen() {
		try {
			this.loading = true;
			const user = await this.supabaseService.getUser();
			if (!user) {
				this.fullName = '';
				this.email = '';
				this.avatarUrl = '';
				this.isPair = false;
				this.isAdmin = false;
				this.loading = false;
				return;
			}

			this.email = user.email ?? '';
			this.isAdmin = await this.authRole.isAdmin().catch(() => false);

			// Detect user role
			try {
				const cached = this.authRole.getCachedRole();
				if (cached) {
					  this.isPair = cached === 'PAIR' || cached === 'PAIR_STAFF' || cached === 'ADMIN' || cached === 'SUPER_ADMIN';
				} else {
					  this.isPair = await this.authRole.canPerformPairActions();
				}
			} catch (e) {
				this.isPair = false;
			}

			// Try to get profile from profiles table by id
			try {
				const profile = await this.supabaseService.getCurrentUserProfile();
				if (profile) {
					this.fullName = profile.full_name || profile.name || (this.email ? this.email.split('@')[0] : '');
					this.avatarUrl = profile.avatar_url || profile.avatar || '';
				} else {
					const meta = (user.user_metadata || {}) as any;
					this.fullName = meta?.full_name || meta?.name || (this.email ? this.email.split('@')[0] : '');
					this.avatarUrl = meta?.avatar_url || meta?.avatar || '';
				}
			} catch (e) {
				const meta = (user.user_metadata || {}) as any;
				this.fullName = meta?.full_name || meta?.name || (this.email ? this.email.split('@')[0] : '');
				this.avatarUrl = meta?.avatar_url || meta?.avatar || '';
			}
		} catch (e) {
			console.error('Menu load user error', e);
		} finally {
			this.loading = false;
		}
	}

	async logout() {
		try {
			// clear cached role then manual sign-out: remove local user
			try { this.authRole.clearRole(); } catch (e) {}
			this.supabaseService.signOutLocal();
		} catch (e) {
			console.error('Sign out error', e);
		}
		try { localStorage.clear(); } catch(e) {}
		try {
			// close the menu first (if open) then navigate
			await this.menu.close('main-menu');
		} catch (e) {}
		this.router.navigateByUrl('/login', { replaceUrl: true });
	}
}
