/*
  * File : file-create.component.ts
  * Description : This is a file create or update component file.
  * Copyright © 2019 Leuphana Universität Lüneburg. All rights reserved.
  */
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormGroup } from '@angular/forms';
// Service for showing toasts and using localstorage
import { UtilService } from 'src/app/services/util.service';
// Common error messages
import { errorInfo } from 'src/environments/environment';
import { forkJoin } from 'rxjs';
// Service for file upload and calculate progress
import { FileuploadService } from 'src/app/services/fileupload.service';
import { Router } from '@angular/router';
// Lodash plugin for work with arrays efficiently
import * as _ from 'lodash';
// Service for handle common api calls
import { PagesService } from 'src/app/services/pages.service';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { DeletemodalComponent } from 'src/app/common/modal/deletemodal/deletemodal.component';

@Component({
  selector: 'app-file-create-update',
  templateUrl: './file-create-update.component.html',
  styleUrls: ['./file-create-update.component.scss']
})
export class FileCreateComponent implements OnInit {

  @ViewChild('file', { read: false, static: false }) file;
  fileput: any;
  public files: Set<File> = new Set();
  uploadForm: FormGroup;
  filename: any;
  uploading = false;
  progress;
  progressvalue: any;
  uploadSuccessful = false;
  projectName: any;
  fileuuid: any;
  modelReference: any;
  inputText: any;
  mime_type: any;

  constructor(private utilService: UtilService,
              private uploadService: FileuploadService,
              private router: Router,
              private pageService: PagesService,
              private modelService: NgbModal) { }

  // On page load , ngOnInit function calls
  ngOnInit() {
    this.utilService.changeState(false);
    this.projectName = this.utilService.getLocalStorageData('project_name');
    this.fileuuid = this.utilService.getLocalStorageData('file_uuid');
    if (this.fileuuid != null) {
      this.filename = this.utilService.getLocalStorageData('file_name');
      this.inputText = this.utilService.getLocalStorageData('file_description');
      this.mime_type = this.utilService.getLocalStorageData('file_mimetype');
    }
  }

  // When user select file
  onFilesAdded(event: any) {
    console.log('file', this.file);
    this.fileput = this.file;
    const files: { [key: string]: File  } = this.file.nativeElement.files;
    console.log('files console',files);
    this.filename = files[0].name;
    const filearray = ['jpg', 'jpeg', 'png', 'gif', 'svg' , 'txt', 'md' , 'html' , 'rtf' , 'pdf' ,  'tab'
                      , 'tsv', 'csv', 'json', 'xls', 'xlsx', 'shp', 'xml', 'geojson', 'shx', 'dbf', 'sbn'
                      , 'sam', 'kml', 'kmx', 'dem', 'std', 'gpx', 'osm', 'gir', 'ddf', 'ntf', 'h5', 'hdf'
                      , 'he5', 'hdf5', 'nc4', 'mp4' , 'flv' , 'avi', 'prj',  'qpj', 'mov'  ];
    for (const key in files) {
      if (!isNaN( parseInt(key, 0) )) {
        this.files.add(files[key]);
        // check filename and its extensions
        const filename = (files[key].name.split('.').slice(0, -1)).join('.');
        const fileextension =  files[key].name.substr(files[key].name.lastIndexOf('.') + 1);
        console.log('file extension', fileextension.toLowerCase());

        // Validate filename with its extension
        if (filename.indexOf(' ') >= 0 ) {
          this.files.delete(files[key]);
          this.utilService.showError(filename + ' ' + errorInfo.fileSpaceError, 'Error');
        } else if (filename !== filename.toLowerCase()) {
          this.files.delete(files[key]);
          this.utilService.showError(filename + ' ' + errorInfo.filelowercaseError, 'Error');
        } else if (filename.length > 50 || filename.length < 0) {
          this.files.delete(files[key]);
          this.utilService.showError(filename + ' ' + errorInfo.filelengthlongError, 'Error');
        } else if (_.includes(filearray, fileextension.toLowerCase())) {
          this.files.add(files[key]);
        } else {
          this.files.delete(files[key]);
          this.utilService.showError(filename + ' ' + errorInfo.fileextensionError, 'Error');
        }
      }
     }
  }

  // On save button click
  uploadFile(description: any) {
    console.log('description', description);
    console.log('this files', this.files);
    // check if file uuid available
    if (this.fileuuid != null) {
      console.log('update loop');
      this.updateFile(description);
    } else {
    // check if file array have any file to upload
    if (this.files.size === 0) {
      console.log('no file choosed');
      return;
    } else {
      console.log('file choosed');
      this.uploading = true;
      // start the upload and save the progress map
      this.progress = this.uploadService.upload(this.files, description);
      console.log('fdd0', this.progress);
        // tslint:disable-next-line: forin
      for (const key in this.progress) {
        console.log('key', key);
        this.progress[key].progress.subscribe(val => {
          console.log('val', val);
          this.progressvalue = val;
        });
        }

         // convert the progress map into an array
      const allProgressObservables = [];
         // tslint:disable-next-line: forin
      for (const key in this.progress) {
               allProgressObservables.push(this.progress[key].progress);
             }
      // When all progress-observables are completed...
      forkJoin(allProgressObservables).subscribe(end => {
               // ... the dialog can be closed again...
              console.log('end', end);
               // ... the upload was successful...
              this.uploadSuccessful = true;
               // ... and the component is no longer uploading
             /*   this.messageservice.setHttpLoaderStatus(true); */
              this.uploading = false;
              this.router.navigate(['../files']);
             });
         }
        }
      }

      // Update file description function
      updateFile(description: any) {
        // Check file extension file
        const mime =  this.mime_type;
        const fileextension = mime.toLowerCase();
        console.log('file extension', fileextension);
        const imageExtension = ['jpg' , 'jpeg' , 'png' , 'svg' , 'gif'];
        const videoExtension = ['mp4' , 'flv' , 'avi', 'mov'];
        const textExtension = ['txt', 'md' , 'html' , 'rtf' , 'pdf'];
        const dataExtension = [ 'tab', 'tsv', 'csv', 'json', 'xls', 'xlsx', 'shp', 'xml'
                              , 'geojson', 'shx', 'dbf', 'sbn', 'sam', 'kml', 'kmx'
                              , 'dem', 'std', 'gpx', 'osm', 'gir', 'ddf', 'ntf', 'h5'
                              , 'hdf', 'he5', 'hdf5', 'nc4',  'prj',  'qpj' ];

        // Different update api as per extension and api call

        // Check If Image File
        if (_.includes(imageExtension, fileextension)) {
            const updateObj = {
              image_uuid: this.fileuuid,
              description
            };
            this.pageService.updateImage(updateObj).then(res => {
              if (res['status'] === 1) {
                this.utilService.showSuccess(res['message'], 'Success');
                this.router.navigate(['../files']);
              } else {
                this.utilService.showError(res['message'], 'Error');
              }
            }).catch(error => {
              this.utilService.showError(errorInfo.commonErrormsg, 'Error');
              console.log('err is', error);
          });
        }

        // Check If Video File
        if (_.includes(videoExtension, fileextension)) {
          const updateObj = {
            video_uuid: this.fileuuid,
            description
          };

          this.pageService.updateVideo(updateObj).then(res => {
            if (res['status'] === 1) {
              this.utilService.showSuccess(res['message'], 'Success');
              this.router.navigate(['../files']);
            } else {
              this.utilService.showError(res['message'], 'Error');
            }
          }).catch(error => {
            this.utilService.showError(errorInfo.commonErrormsg, 'Error');
            console.log('err is', error);
        });
      }

      // Check If Text File
        if (_.includes(textExtension, fileextension)) {
        const updateObj = {
          text_uuid: this.fileuuid,
          description
        };

        this.pageService.updateTextFile(updateObj).then(res => {
          if (res['status'] === 1) {
            this.utilService.showSuccess(res['message'], 'Success');
            this.router.navigate(['../files']);
          } else {
            this.utilService.showError(res['message'], 'Error');
          }
        }).catch(error => {
          this.utilService.showError(errorInfo.commonErrormsg, 'Error');
          console.log('err is', error);
        });
      }

      // Check If data File
        if (_.includes(dataExtension, fileextension)) {
        const updateObj = {
          data_uuid: this.fileuuid,
          description
        };

        this.pageService.updateDataFile(updateObj).then(res => {
          if (res['status'] === 1) {
            this.utilService.showSuccess(res['message'], 'Success');
            this.router.navigate(['../files']);
          } else {
            this.utilService.showError(res['message'], 'Error');
          }
        }).catch(error => {
          this.utilService.showError(errorInfo.commonErrormsg, 'Error');
          console.log('err is', error);
        });
       }

    }

     // Delete Notebook Api + Delete ModalCall
    deleteFile() {
       const projectdelete = {
        name : this.filename,
        uuid : this.fileuuid,
        deletetype: 'filedelete'
    };

       // Open DeleteModal

       this.modelReference = this.modelService.open(DeletemodalComponent);
       this.modelReference.componentInstance.projectdelete = projectdelete;
       this.modelReference.result.then(res => {
          // Callback projectlist Api
          if (res.result === 'accept') {
            this.router.navigate(['../files']);
          }
      });
    }
}

