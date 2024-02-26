import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ForceGraphComponent } from './force-graph/force-graph.component';
import { FormComponent } from './form/form.component';

@NgModule({
  declarations: [FormComponent, ForceGraphComponent],
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  exports: [FormComponent, ForceGraphComponent],
})
export class ComponentsModule {}
