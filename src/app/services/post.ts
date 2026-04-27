import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, collectionData, doc, updateDoc } from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class PostService {

  constructor(private firestore: Firestore) {}

  addPost(content: string) {
  const ref = collection(this.firestore, 'posts');
  return addDoc(ref, {
    content,
    status: 'pending',     // pending | in_review | completed
    feedback: '',
    createdAt: new Date()
  });
}

updatePost(id: string, data: any) {
  const ref = doc(this.firestore, `posts/${id}`);
  return updateDoc(ref, data);

  }

  getPosts() {
    const ref = collection(this.firestore, 'posts');
    return collectionData(ref, { idField: 'id' });
  }

  completePost(id: string) {
    const ref = doc(this.firestore, `posts/${id}`);
    return updateDoc(ref, { status: 'completed' });
  }
}