import { TestBed } from '@angular/core/testing';

import { PostService } from './post';
import { SupabaseService } from './supabase';

describe('PostService', () => {
  let service: PostService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [{ provide: SupabaseService, useValue: {} }] });
    service = TestBed.inject(PostService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
