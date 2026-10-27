import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AllSubmissionsPage } from './all-submissions.page';
import { AuthRoleService } from '../../services/auth-role.service';
import { SupabaseService } from '../../services/supabase';

describe('AllSubmissionsPage', () => {
  let component: AllSubmissionsPage;
  let fixture: ComponentFixture<AllSubmissionsPage>;
  let supabaseService: jasmine.SpyObj<SupabaseService>;

  beforeEach(() => {
    supabaseService = jasmine.createSpyObj<SupabaseService>('SupabaseService', ['getSubmissions']);
    supabaseService.getSubmissions.and.resolveTo({ data: [], error: null });
    const authRole = jasmine.createSpyObj<AuthRoleService>('AuthRoleService', [
      'loadRole',
      'canPerformPairActions',
      'isCreator',
      'getCachedRole'
    ]);
    authRole.loadRole.and.resolveTo('ORGANIZATION');
    authRole.canPerformPairActions.and.resolveTo(false);
    authRole.isCreator.and.resolveTo(true);

    TestBed.configureTestingModule({
      providers: [
        { provide: SupabaseService, useValue: supabaseService },
        { provide: ModalController, useValue: jasmine.createSpyObj('ModalController', ['create']) },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigateByUrl']) },
        { provide: AuthRoleService, useValue: authRole }
      ]
    });
    fixture = TestBed.createComponent(AllSubmissionsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads submissions for the current account', async () => {
    const submission = { id: 12, original_caption: 'Org announcement' };
    supabaseService.getSubmissions.and.resolveTo({ data: [submission], error: null });

    await component.getPosts();

    expect(supabaseService.getSubmissions).toHaveBeenCalled();
    expect(component.posts).toEqual([submission]);
  });

});
