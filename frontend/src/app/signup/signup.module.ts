import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { SignupPage } from './signup.page';
import { PasswordRequirementsComponent } from '../shared/password-requirements/password-requirements.component';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, PasswordRequirementsComponent, RouterModule.forChild([{ path: '', component: SignupPage }])],
  declarations: [SignupPage]
})
export class SignupPageModule {}
