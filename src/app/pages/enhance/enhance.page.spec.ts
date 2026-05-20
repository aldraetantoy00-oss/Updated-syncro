import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EnhancePage } from './enhance.page';

describe('EnhancePage', () => {
  let component: EnhancePage;
  let fixture: ComponentFixture<EnhancePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EnhancePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
