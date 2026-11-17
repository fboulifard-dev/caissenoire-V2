import { Component, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { passwordRequirements } from '../../services/password-policy';

@Component({
  selector: 'app-password-requirements',
  templateUrl: './password-requirements.component.html',
  styleUrls: ['./password-requirements.component.scss'],
  imports: [IonicModule]
})
export class PasswordRequirementsComponent {
  @Input() password = '';

  get requirements() {
    return passwordRequirements(this.password);
  }
}
