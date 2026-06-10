import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { AppRoutingModule } from './app-routing.module';

// Firebase
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';

// HTTP
import { provideHttpClient } from '@angular/common/http';

import { environment } from '../environments/environment';

// Conditionally include Firebase providers when config present
const firebaseProviders = (environment as any)?.firebase
  ? [
      provideFirebaseApp(() => initializeApp((environment as any).firebase)),
      provideAuth(() => getAuth()),
      provideFirestore(() => getFirestore()),
    ]
  : [];

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    IonicModule.forRoot(),
    AppRoutingModule,
    FormsModule,
    SidebarComponent
  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    // Firebase providers (conditionally added)
    ...firebaseProviders,

    provideHttpClient()
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}