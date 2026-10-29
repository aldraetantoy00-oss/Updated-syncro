import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { NotificationsPage } from './notifications.page';
import { SupabaseService } from '../../services/supabase';

describe('NotificationsPage', () => {
  let component: NotificationsPage;
  let fixture: ComponentFixture<NotificationsPage>;
  let supabaseService: jasmine.SpyObj<SupabaseService>;

  beforeEach(() => {
    supabaseService = jasmine.createSpyObj<SupabaseService>('SupabaseService', ['getNotifications']);
    supabaseService.getNotifications.and.resolveTo({ data: [], error: null });

    TestBed.configureTestingModule({
      imports: [CommonModule, IonicModule.forRoot()],
      declarations: [NotificationsPage],
      providers: [{ provide: SupabaseService, useValue: supabaseService }]
    });
    fixture = TestBed.createComponent(NotificationsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads authenticated notifications and parses their data', async () => {
    supabaseService.getNotifications.and.resolveTo({
      data: [{
        id: 'notice-1',
        data: JSON.stringify({ title: 'Submission approved', message: 'Your content is approved.' }),
        created_at: '2026-10-29T08:00:00.000Z'
      }],
      error: null
    });

    await component.getNotifications();

    expect(supabaseService.getNotifications).toHaveBeenCalled();
    expect(component.notifications[0].parsedData.title).toBe('Submission approved');
    expect(component.loading).toBeFalse();
  });
});
