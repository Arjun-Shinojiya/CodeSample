/*
  * File : util.service.ts
  * Description : This service includes common tasks like accessing localstorage,show toasts,
  *               transfer data from one component to other component etc.
  * Copyright © 2019 Leuphana Universität Lüneburg. All rights reserved.
  */
import { Injectable, TemplateRef, EventEmitter } from '@angular/core';
// Plugin for showing toasts
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class UtilService {

  disabled: boolean = true;
  private buttondisable = new BehaviorSubject(true);
  currentposition = this.buttondisable.asObservable();
  toasts: any[] = [];
  colorcode: any  ;
  private messageSource = new BehaviorSubject('#000000');
  currentMessage = this.messageSource.asObservable();

  constructor(
    private toasterService: ToastrService
  ) { }

  // oncolor change input value change
  changeColor(color: string) {
    const hex = this.rgb2hex(color);
    this.messageSource.next(hex);
  }

  // Enable and disable button
  changeState(value: boolean) {
    this.buttondisable.next(value);
  }

  // Function to convert rgb color to hex format
 rgb2hex(rgb) {
   console.log('rgb', rgb);
   rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
   return (rgb && rgb.length === 4) ? '#' +
   ('0' + parseInt(rgb[1], 10).toString(16)).slice(-2) +
   ('0' + parseInt(rgb[2], 10).toString(16)).slice(-2) +
   ('0' + parseInt(rgb[3], 10).toString(16)).slice(-2) : '';
 }

 // Show error toast message
 showError(title, message) {
  this.toasterService.error(title, message);
 }

// Show success toast message
 showSuccess(title, message) {
  this.toasterService.success(title, message);
 }


 /**
  * Check user is login or not
  */
  isLoggedIn(): boolean {
    return localStorage.getItem('token') ? true : false;
  }

 /* localStorage service */
  clearLocalStorage() {
  localStorage.clear();
 }

 // Set localstorage data
  setLocalStorageData(key, value) {
  const enc = JSON.stringify(value);
  localStorage.setItem(key, window.btoa(enc));
 }

  // Get localstorage data
  getLocalStorageData(key) {
  if (localStorage.getItem(key)) {
    const dec = window.atob(localStorage.getItem(key));
    return JSON.parse(dec);
   } else {
    return null;
   }
 }

  // remove data from localstorage
  removeLocalStorageData(key) {
  localStorage.removeItem(key);
 }

}
