import { AuthRoleService } from './auth-role.service';
import { SupabaseService } from './supabase';

describe('AuthRoleService database roles', () => {
  let service: AuthRoleService;

  beforeEach(() => {
    localStorage.removeItem('debugRole');
    service = new AuthRoleService({} as SupabaseService);
  });

  it('recognizes admin and super_admin as administrators', async () => {
    service.setRole('admin');
    expect(await service.isAdmin()).toBeTrue();

    service.setRole('super_admin');
    expect(await service.isAdmin()).toBeTrue();
  });

  it('recognizes pair role values', async () => {
    service.setRole('pair');
    expect(await service.isPair()).toBeTrue();

    service.setRole('pair_staff');
    expect(await service.isPair()).toBeTrue();
  });

  it('recognizes organization and department roles without granting unknown roles', async () => {
    for (const role of ['org', 'department', 'creator', 'organization']) {
      service.setRole(role);
      expect(await service.isCreator()).withContext(role).toBeTrue();
    }

    service.setRole('unknown');
    expect(await service.isCreator()).toBeFalse();
  });

  it('allows pair actions only for pair and admin roles', async () => {
    service.setRole('super_admin');
    expect(await service.canPerformPairActions()).toBeTrue();

    service.setRole('org');
    expect(await service.canPerformPairActions()).toBeFalse();
  });
});