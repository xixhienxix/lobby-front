import {Component, OnInit} from '@angular/core';

@Component({
  selector: 'app-purchase-toolbar',
  templateUrl: './purchase-toolbar.component.html',
})
export class PurchaseToolbarComponent implements OnInit {
  appPurchaseUrl: string = '';

  constructor() {
  }

  ngOnInit(): void {
  }
}
