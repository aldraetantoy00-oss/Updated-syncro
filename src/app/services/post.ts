import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  collectionData,
  doc,
  updateDoc
} from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class PostService {

  private firestore = inject(Firestore);

  // ✅ SAVE POST
  async addPost(data: any) {
    const refCol = collection(this.firestore, 'posts');

    return addDoc(refCol, {
      content: data.content || '',
      links: data.links || [],
      images: data.images || [], // base64 (compressed)
      status: 'pending',
      feedback: '',
      createdAt: new Date()
    });
  }

  // ✅ GET POSTS
  getPosts() {
    const refCol = collection(this.firestore, 'posts');
    return collectionData(refCol, { idField: 'id' });
  }

  // ✅ UPDATE POST
  updatePost(id: string, data: any) {
    const refDoc = doc(this.firestore, `posts/${id}`);
    return updateDoc(refDoc, data);
  }
}