import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ChartDataService } from 'src/app/services/chart-data.service';
import { formFields } from '../../data/form-fields';

@Component({
  selector: 'app-form',
  templateUrl: './form.component.html',
  styleUrl: './form.component.scss',
})
export class FormComponent {
  private fb = inject(FormBuilder);
  private chartDataService = inject(ChartDataService);

  public formFields = formFields;

  public graphForm: FormGroup = this.fb.group({
    gender: ['', [Validators.required]],
    ageGroup: ['', [Validators.required]],
    educationLevel: ['', [Validators.required]],
    employmentStatus: ['', [Validators.required]],
    maritalStatus: ['', [Validators.required]],
    incomeRange: ['', [Validators.required]],
    ethnicity: ['', [Validators.required]],
    religion: ['', [Validators.required]],
    dietaryPreference: ['', [Validators.required]],
    language: ['', [Validators.required]],
    transportationMode: ['', [Validators.required]],
    internetConnectionType: ['', [Validators.required]],
    mobileOperatingSystem: ['', [Validators.required]],
    musicGenre: ['', [Validators.required]],
    hobbies: ['', [Validators.required]],
  });

  public filterForm: FormGroup = this.fb.group({
    filter: [0, [Validators.required]],
  });

  constructor() {
    this.mockUpForm();
    this.submitForm();

    this.filterForm.get('filter').valueChanges.subscribe({
      next: (value) => {
        if (value < 0) return;
        this.chartDataService.numberFilter.next(value);
      },
    });
  }

  submitForm() {
    this.chartDataService.addPerson(this.graphForm.value);
    this.mockUpForm();
  }

  mockUpForm() {
    for (const item in this.graphForm.value) {
      if (Object.prototype.hasOwnProperty.call(this.graphForm.value, item)) {
        const field = this.formFields.find((f) => f.field === item);
        const randomNumber = Math.floor(Math.random() * 3);
        this.graphForm.get(item).setValue(field.options[randomNumber].id);
      }
    }
  }
}
