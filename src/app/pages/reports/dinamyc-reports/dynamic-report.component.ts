import { Component, Input, Output, EventEmitter, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDatepickerInputEvent } from '@angular/material/datepicker';
import { Huesped, reservationStatusMap } from 'src/app/models/huesped.model';
import { IndexDBCheckingService } from 'src/app/services/_shared/indexdb.checking.service';
import { DateTime } from 'luxon';
import { CommunicationService } from '../_services/event.services';

@Component({
  selector: 'app-dynamic-report',
  templateUrl: './dynamic-report.component.html',
  styleUrls: ['./dynamic-report.component.scss']
})
export class DynamicReportComponent implements OnInit, AfterViewInit {
  colorDict = {
    0: '#99d284',
    1: '#fab3db',
    2: '#d0aaec',
    3: '#fac34e',
    4: '#DD4F5D',
    5: '#808080'
  };

  @Input() colorMap: Record<string, string> = {};
  @Input() displayedColumns: string[] = [];
  @Input() dataArray: any[] = [];
  @Input() statusOptions: string[] = [];

  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onActionClick = new EventEmitter<any>();

  filteredReservations = new MatTableDataSource<any>([]);
  filterText: string = '';
  filterDateValue: Date | null = null;
  llegadaDateValue: Date | null = null;
  salidaDateValue: Date | null = null;
  selectedStatus: string | null = null;
  reportType: string = '';

  allReservaciones: any[] = [];
  prospectsArray: any[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private route: ActivatedRoute,
    private indexDbService: IndexDBCheckingService,
    private communicationService: CommunicationService

  ) {}

  async ngOnInit(): Promise<void> {
    await this.indexDbService.checkIndexedDB(['reservaciones'], true);
    this.allReservaciones = await this.indexDbService.loadReservaciones();

    console.log(this.allReservaciones);
    this.filteredReservations.filterPredicate = (data: any, filter: string): boolean => {
      const parsedFilter = JSON.parse(filter); // Parse the filter string into an object
      
      // Existing logic for other fields (name, folio, estatus, habitacion)
      const nameMatches = data.nombre.toLowerCase().includes(parsedFilter.nombre?.toLowerCase() || '');
      const folioMatches = data.folio.toLowerCase().includes(parsedFilter.folio?.toLowerCase() || '');
      const estatusMatches = data.estatus === parsedFilter.estatus || !parsedFilter.estatus;
      const habitacionMatches = data.habitacion === parsedFilter.habitacion || !parsedFilter.habitacion;
      
      // Date matching (Convert 'llegada' to ISODate)
      const llegadaMatches = parsedFilter.llegada 
        ? data.llegada === parsedFilter.llegada 
        : true;
      
      return nameMatches && folioMatches && estatusMatches && habitacionMatches && llegadaMatches;
    };
    
    

    this.route.params.subscribe((params) => {
      this.reportType = params['reportType'];
      this.loadDynamicColumnsProspects();

      this.loadReportData();
    });

  }

  loadDynamicColumnsProspects(): void {
    this.displayedColumns = ['nombre', 'telefono', 'email', 'llegada', 'salida', 'estatus', 'acciones'];

    // Example of dynamically adding columns based on some logic
    if (this.displayedColumns && !this.displayedColumns.includes('acciones')) {
      
      this.displayedColumns.push('acciones');
    }

    // Add your dynamic data here, if needed
    this.filteredReservations.data = this.dataArray;
  }

  loadReportData(): void {
    if (this.reportType === 'prospects') {
      this.loadProspectsReport();
    } else if (this.reportType === 'reservations') {
      // Add reservation-specific logic here if needed.
    }
  }

  loadProspectsReport(): void {
    this.loadProspectsColors();

    // Ensure reservationStatusMap values are correctly assigned
    this.statusOptions = [...reservationStatusMap[2]];

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // Filter prospects
    this.prospectsArray = this.filterHuespedes(this.allReservaciones);
    this.filteredReservations.data = this.prospectsArray;

    // Assign paginator after setting data
    this.filteredReservations.paginator = this.paginator;

    console.log(this.prospectsArray);
  }

  loadProspectsColors(): void {
    // Define color mapping
    this.colorMap = {
      'Huesped en Casa': this.colorDict[0],
      'Reserva Sin Pago': this.colorDict[3],
      'Reserva Confirmada': this.colorDict[3],
      'Deposito Realizado': this.colorDict[3],
      'Esperando Deposito': this.colorDict[3],
      'Totalmente Pagada': this.colorDict[3],
      'Hizo Checkout': this.colorDict[4],
      'Uso Interno': this.colorDict[2],
      'Bloqueo': this.colorDict[3],
      'Reserva Temporal': this.colorDict[1],
      'No Show': this.colorDict[4],
      'Check-Out': this.colorDict[4],
      'Reserva Cancelada': this.colorDict[4],
      'Walk-In': this.colorDict[0],
      'Reserva en Casa': this.colorDict[0],
      'Reserva': this.colorDict[3],
      'default': this.colorDict[0]
    };
  }

  filterHuespedes(huespedes: any[]): any[] {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    return huespedes.filter((huesped) => {
      const llegadaDate = new Date(huesped.llegada);
      const salidaDate = new Date(huesped.salida);

      const isThisMonth =
        (llegadaDate.getMonth() === currentMonth && llegadaDate.getFullYear() === currentYear) ||
        (salidaDate.getMonth() === currentMonth && salidaDate.getFullYear() === currentYear);

      const matchesEstatus = reservationStatusMap[2].includes(huesped.estatus);

      return isThisMonth && matchesEstatus;
    });
  }

  ngAfterViewInit(): void {
    this.filteredReservations.paginator = this.paginator;
  }

  // applyFilter(filters: { nombre?: string; folio?: string; estatus?: string; habitacion?: string }): void {
  //   this.filteredReservations.filter = JSON.stringify(filters); // Convert filters to a JSON string
  // }
  applyDateFilter(event: any): void {
    const dateFilter = event.value; // Get the selected date (moment object)
    const formattedDate = dateFilter ? dateFilter.format('YYYY-MM-DD') : ''; // Format the date to match 'llegada'
    this.applyFilter({ llegada: formattedDate, salida: formattedDate }); // Apply the date filter
  }
  
  applyFilter(filters: { nombre?: string; folio?: string; estatus?: string; habitacion?: string; llegada?: string; salida?: string }): void {
    this.filteredReservations.data = this.prospectsArray.filter((reservation) => {
      // Match 'nombre' with the filter text
      const nombreMatches = filters.nombre ? reservation.nombre.toLowerCase().includes(filters.nombre.toLowerCase()) : true;
      
      // Match 'folio' with the filter text
      const folioMatches = filters.folio ? reservation.folio.toLowerCase().includes(filters.folio.toLowerCase()) : true;
      
      // Status Filter
      const estatusMatches = filters.estatus ? reservation.estatus === filters.estatus : true;
      
      // Date Filters: Compare only the date part of 'llegada' (ignoring time)
      const llegadaMatches = filters.llegada ? reservation.llegada.split('T')[0] === filters.llegada : true;
      
      // Habitacion Filter
      const habitacionMatches = filters.habitacion ? reservation.habitacion === filters.habitacion : true;
      
      // Combine all conditions: 
      // Ensure that each filter must match
      return (nombreMatches || folioMatches) && estatusMatches && habitacionMatches && llegadaMatches;
    });
  }
  
  
  
  applySpecificDateFilter(date: Date): void {
    if (date) {
      this.filteredReservations.data = this.prospectsArray.filter((reservation) =>
        new Date(reservation.creada).toDateString() === new Date(date).toDateString()
      );
    } else {
      this.filteredReservations.data = this.prospectsArray;
    }
  }

  applyLlegadaDateFilter(date: Date): void {
    if (date) {
      this.filteredReservations.data = this.prospectsArray.filter((reservation) =>
        new Date(reservation.llegada).toDateString() === new Date(date).toDateString()
      );
    } else {
      this.filteredReservations.data = this.prospectsArray;
    }
  }

  // applySalidaDateFilter(date: Date): void {
  //   if (date) {
  //     this.filteredReservations.data = this.prospectsArray.filter((reservation) =>
  //       new Date(reservation.salida).toDateString() === new Date(date).toDateString()
  //     );
  //   } else {
  //     this.filteredReservations.data = this.prospectsArray;
  //   }
  // }

  // applyStatusFilter(status: string): void {
  //   if (status) {
  //     this.filteredReservations.data = this.prospectsArray.filter(
  //       (reservation) => reservation.estatus === status
  //     );
  //   } else {
  //     this.filteredReservations.data = this.prospectsArray;
  //   }
  // }

  applyStatusFilter(status: string): void {
    if (status) {
      this.applyFilter({ estatus: status });  // Apply the filter through applyFilter
    } else {
      this.applyFilter({ estatus: '' });  // Clear the status filter when no status is selected
    }
  }
  

  // resetFilters(): void {
  //   this.filterText = '';
  //   this.filterDateValue = null;
  //   this.llegadaDateValue = null;
  //   this.salidaDateValue = null;
  //   this.selectedStatus = null;

  //   this.filteredReservations.filter = '';
  //   this.filteredReservations.data = this.prospectsArray;

  //   this.paginator.pageIndex = 0;
  //   this.paginator.pageSize = 10;
  // }
  resetFilters(): void {
    this.filterText = '';
    this.filterDateValue = null;
    this.selectedStatus = '';
    this.applyFilter({ nombre: '', folio: '', estatus: '', habitacion: '' }); // Reset all filters
  }

  getColor(status: string): string {
    return this.colorMap[status] || this.colorMap['default'];
  }

  emitAction(element: any): void {
    this.communicationService.emitEvent(element);
  }
}


