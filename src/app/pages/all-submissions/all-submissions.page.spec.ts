import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AllSubmissionsPage } from './all-submissions.page';

describe('AllSubmissionsPage', () => {
  let component: AllSubmissionsPage;
  let fixture: ComponentFixture<AllSubmissionsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AllSubmissionsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
