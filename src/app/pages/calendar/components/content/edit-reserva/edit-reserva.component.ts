/* eslint-disable @angular-eslint/no-output-on-prefix */
import { AfterViewInit, ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { ModalDismissReasons, NgbActiveModal, NgbModal, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { DEFAULT_HUESPED, Huesped } from 'src/app/models/huesped.model';
import { FormBuilder, FormGroup } from '@angular/forms';
import { HuespedService } from 'src/app/services/huesped.service';
import { Subject, Subscription, firstValueFrom } from 'rxjs';
import { AlertsMessageInterface } from 'src/app/models/message.model';
import { Adicional } from 'src/app/models/adicional.model';
import { Promesa } from 'src/app/pages/calendar/_models/promesas.model';
import { HouseKeeping } from 'src/app/pages/calendar/_models/housekeeping.model';
import { Estatus } from 'src/app/pages/calendar/_models/estatus.model';
import { Habitacion } from 'src/app/models/habitaciones.model';
import { ConfirmationModalComponent } from 'src/app/_metronic/layout/components/header/reservations/_modals/confirmation-modal.component';
import { AlertsComponent } from 'src/app/_metronic/shared/alerts/alerts.component';
import { DateTime } from 'luxon';
import { Edo_Cuenta_Service } from 'src/app/services/edoCuenta.service';
import { SaldoCuentaComponent } from './components/edoCuenta/components/saldar.cuenta.component';
import { edoCuenta } from 'src/app/models/edoCuenta.model';
import { EstatusService } from '../../../_services/estatus.service';
import { Codigos } from 'src/app/models/codigos.model';
import { ModificaReservaComponent } from './components/modifica/modifica.reserva.component';
import { NvaReservaComponent } from 'src/app/_metronic/layout/components/header/reservations/nva-reserva/nva-reserva.component';
import { Tarifas } from 'src/app/models/tarifas';

@Component({
  selector: 'app-edit-reserva',
  templateUrl: './edit-reserva.component.html',
  styleUrls: ['./edit-reserva.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class EditReservaComponent implements OnInit, OnDestroy{

  /**LOADING SUBJECT */
  loadingSubject: Subject<boolean> = new Subject<boolean>();


  formGroup:FormGroup
  isLoading:boolean=false;
  selectedIndex:number
  /**Dates */
  intialDate:Date = new Date();
  todayDate:Date = new Date();

  /**DOM */
  colorAma:string=''
  
  /**Models */
  currentEdoCuenta:edoCuenta[];

  changingPromesasValue: Subject<Promesa[]> = new Subject();
  onSuccessResponse:Subject<boolean> = new Subject();
  adicionalSubject:Subject<Adicional[]> = new Subject();

  //Checkout
  nochesReales:number;
  totalAlojamientoNuevo:number;
  alojamiento_id:string;
  saldoPendiente:number;
  closeResult: string;

  private subscriptions: Subscription[] = [];

  //Model
  currentHuesped:Huesped
  porPagar:number=0;
  pendiente:number=0;
  


  @Input() promesasDisplay:boolean=false;
  @Input() houseKeepingCodes:HouseKeeping[]=[]
  @Input() estatusArray:Estatus[]=[];
  @Input() data:any;
  @Input() llegahoy:boolean=false;
  @Input() currentRoom:Habitacion;
  @Input() codigosCargo:Codigos[]
  @Input() folio:string
  @Input() ratesArrayComplete:Tarifas[]=[]
  @Input() roomCodesComplete:Habitacion[]=[]


  @Output() onAgregarPago: EventEmitter<edoCuenta> = new EventEmitter();
  @Output() onEditRsv: EventEmitter<Huesped[]> = new EventEmitter();
  @Output() onOpenEnviarReservacion: EventEmitter<boolean> = new EventEmitter();
  @Output() onGetAdicionales: EventEmitter<boolean> = new EventEmitter();
  @Output() onGetPromesas: EventEmitter<string> = new EventEmitter();
  @Output() onUpdateEstatusHuesped: EventEmitter<Huesped> = new EventEmitter();
  @Output() onAlertMessage: EventEmitter<AlertsMessageInterface> = new EventEmitter();
  @Output() onGuardarPromesa: EventEmitter<any> = new EventEmitter();
  @Output() onChangeAmaStatus: EventEmitter<any> = new EventEmitter();
  @Output() onEstatusChange: EventEmitter<any> = new EventEmitter();
  @Output() onEstatusAplicado: EventEmitter<Huesped> = new EventEmitter();
  @Output() onCheckOut: EventEmitter<any> = new EventEmitter();
  @Output() onFetchReservations: EventEmitter<Huesped> = new EventEmitter();
  @Output() onActualizarCuenta: EventEmitter<any> = new EventEmitter();
  @Output() honUpdateHuesped: EventEmitter<any> = new EventEmitter();
  constructor(      
    public modal: NgbActiveModal,
    private modalService: NgbModal,
    public fb:FormBuilder,
    private _edoCuentaService: Edo_Cuenta_Service,
    private _huespedService: HuespedService,
    private _estatusService: EstatusService,
    private cdRef: ChangeDetectorRef,
  ){
    this._huespedService.currentHuesped$.subscribe({
      next:(reserva:Huesped)=>{
        this.currentHuesped = reserva
        this.porPagar = reserva.porPagar!
        this.pendiente = reserva.pendiente!
      }
    })
  }
  async ngOnInit(){

    this.formGroup = this.fb.group({
      estatus : [this.currentHuesped.estatus],
      ama:[this.currentRoom.Estatus]
    });

    this.adicionalSubject.subscribe({
      next:(value:Adicional[])=>{
        this.adicionalSubject.next(value);
      }
    });

    this._edoCuentaService.subject.subscribe({
      next:(val)=>{
        console.log("val");
        this.getCuentas();
      }
    })

    const ccounting_Response = await this.getCuentas();

    let fechaDeLlegada = new Date(parseInt(this.currentHuesped.llegada.split('/')[2]),parseInt(this.currentHuesped.llegada.split('/')[1])-1,parseInt(this.currentHuesped.llegada.split('/')[0])) 
    this.intialDate = fechaDeLlegada
    console.log(this.houseKeepingCodes);
    this.colorAma = this.houseKeepingCodes.find((item)=> item.Descripcion === this.currentRoom.Estatus)!?.Color

    // this.formGroup.controls["ama"].patchValue(this.currentRoom.Estatus);
    this.cdRef.detectChanges();

  }

  //OPTIMIZED FUNCTIONS
  honCheckOut(estatus:number, folio:number){  
    const todayDate = new Date();
    const currentHuesped = this.currentHuesped;

    const getTimeDifference = (date1: Date, date2: Date) => Math.ceil((date1.getTime() - date2.getTime()) / (1000 * 3600 * 24));

    const nochesAlojadas = getTimeDifference(todayDate, new Date(currentHuesped.llegada));
    const nochesReservadas = getTimeDifference(new Date(currentHuesped.salida), new Date(currentHuesped.llegada));

    this.nochesReales = nochesAlojadas === 0 ? 1 : nochesAlojadas;
    this.totalAlojamientoNuevo = 0; // this.huesped.tarifa * this.nochesReales

    const cargosSinAlojamiento = this._edoCuentaService.currentCuentaValue.filter(cargo => cargo.Cargo! > 0 && cargo.Descripcion !== 'Alojamiento');
    const abonos = this._edoCuentaService.currentCuentaValue.filter(abono => abono.Abono! > 0);
    const alojamientoAnterior = this._edoCuentaService.currentCuentaValue.find(alojamiento => alojamiento.Descripcion === 'Alojamiento');

    if (alojamientoAnterior) {
      this.alojamiento_id = alojamientoAnterior._id!;
    }

    const totalAbonos = abonos.reduce((total, abono) => total + abono.Abono!, 0);
    const totalCargosSinAlojamiento = cargosSinAlojamiento.reduce((total, cargo) => total + cargo.Cargo!, 0);

    this.saldoPendiente = totalCargosSinAlojamiento + this.totalAlojamientoNuevo - totalAbonos;

    const fechaSalida = DateTime.fromISO(currentHuesped.salida.split("T")[0]);
    const fechaLlegada = DateTime.fromISO(currentHuesped.llegada.split("T")[0]);
    const luxonTodayDate = DateTime.fromJSDate(todayDate);

    if (fechaSalida.startOf("day") >= luxonTodayDate.startOf("day")) {
      const modalRef = this.modalService.open(AlertsComponent, { size: 'sm' });
      modalRef.componentInstance.alertHeader = 'Advertencia';
      modalRef.componentInstance.mensaje = 'La fecha de salida del huésped es posterior al día de hoy, ¿desea realizar un Check-Out anticipado?';
      modalRef.result.then((result) => {
        if (result === 'Aceptar') {
          if (this.saldoPendiente === 0) {   
            this.checkOutfunction();
          } else {
            this.promptToLiquidateAccount();
          }
        }
        this.isLoading = false;
        this.closeResult = `Closed with: ${result}`;
      }, (reason) => {
        this.isLoading = false;
        this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
      });
    } else {
      if (currentHuesped.pendiente === 0) {
        this.onEstatusChange.emit({ huesped: currentHuesped, estatus, checkout: true });
      } else {
        this.promptToLiquidateAccount();
      }
    }
  }

  handleLoading(isLoading: boolean) {
    this.loadingSubject.next(isLoading);
  }

  promptToLiquidateAccount() {
    const modalRef = this.modalService.open(AlertsComponent, { size: 'sm', backdrop: 'static' });
    modalRef.componentInstance.alertHeader = 'Advertencia';
    modalRef.componentInstance.mensaje = 'Aun queda Saldo pendiente en la cuenta, ¿desea liquidar la cuenta?';
    
    modalRef.result.then((result) => {
      if (result === 'Aceptar') {
        this.saldarCuenta();
      }
      this.closeResult = `Closed with: ${result}`;
    }, (reason) => {
      this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
    });
  }  

  onEstatusUpdate(estatus:number){
    const sb = this._estatusService.actualizaEstatus(estatus.toString(), this.folio, this.currentHuesped).subscribe({
      next: () => {
        this.isLoading = false;
    
        const statusMessages: { [key: number]: string } = {
          3: "Reservación confirmada",
          2: "Reservación realizada con éxito",
          1: "Check-in realizado con éxito",
          4: "Check-out realizado con éxito",
          11: "No-show, para reactivar la reservación haga clic en el botón en la parte inferior",
          12: "Reservación cancelada con éxito"
        };
    
        this.onAlertMessage.emit({ tittle: 'ÉXITO', message: statusMessages[estatus] || '' });
        this.onFetchReservations.emit();
        this.closeModal();
      },
      error: (err) => {
        if (err) {
          this.isLoading = false;
    
          const modalRef = this.modalService.open(AlertsComponent, { size: 'sm', backdrop: 'static' });
          modalRef.componentInstance.alertHeader = 'ERROR';
          modalRef.componentInstance.mensaje = 'Ocurrió un error al actualizar el estatus, vuelve a intentarlo';
          modalRef.result.then(
            result => {
              this.closeResult = `Closed with: ${result}`;
            },
            reason => {
              this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
            }
          );
    
          setTimeout(() => {
            modalRef.close('Close click');
          }, 4000);
        }
      },
      complete: () => {}
    });
  }

  setStep(index:number){
    this.selectedIndex=index;
  }

  openModifica(){
    const standardRatesArray = this.ratesArrayComplete.filter((item)=>item.Tarifa === 'Tarifa Base');
    const tempRatesArray = this.ratesArrayComplete.filter((item)=>item.Tarifa === 'Tarifa De Temporada');
    const roomCodes = Object.values(
      this.roomCodesComplete.reduce((acc, obj) => ({ ...acc, [obj.Codigo]: obj }), {})
    ); 

    const modalRef = this.modalService.open(ModificaReservaComponent,{ size: 'lg', backdrop:'static' })  
    modalRef.componentInstance.currentHuesped = this.currentHuesped;
    // modalRef.componentInstance.adultos = this.currentHuesped.adultos;
    // modalRef.componentInstance.ninos = this.currentHuesped.ninos;
    modalRef.componentInstance.estatusArray = this.estatusArray
    modalRef.componentInstance.roomCodesComplete = this.roomCodesComplete
    modalRef.componentInstance.roomCodes=roomCodes
    modalRef.componentInstance.ratesArrayComplete = this.ratesArrayComplete
    modalRef.componentInstance.standardRatesArray = standardRatesArray
    modalRef.componentInstance.tempRatesArray = tempRatesArray
    modalRef.componentInstance.honUpdateHuesped.subscribe({
      next:async (huespedArray:Huesped[])=>{
        let pago:edoCuenta=
        {Folio:'',
            Forma_de_Pago:'',
            Fecha:new Date(),
                  Descripcion:'HOSPEDAJE',
                  Cantidad:1,
                  Cargo:0,
                  Abono:0,
                  Total:0,
                  Estatus:'Activo'}
        
        huespedArray.map((item)=>{
          pago={
            Folio:item.folio,
            Forma_de_Pago:'',
            Fecha:new Date(),
                  Descripcion:'HOSPEDAJE',
                  Cantidad:1,
                  Cargo:item.pendiente,
                  Abono:0,
                  Total:item.pendiente,
                  Estatus:'Activo',
          }
        });
        this.honUpdateHuesped.emit({updatedHuesped:huespedArray,pago})

      }
    })
    
    modalRef.result.then((result) => {
        console.log(result)
      this.closeResult = `Closed with: ${result}`;
      }, (reason) => {
          this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
      });
  
      return
  }

  ///// NOT OPTIMIZED 

  async getCuentas(){
      this._edoCuentaService.getCuentas(this.currentHuesped.folio).subscribe({
        next:(value)=>{
          this.currentEdoCuenta = value  
          this.cdRef.detectChanges();  
        },
        error:()=>{

        }
    })
  }

  isCurrentStatus(statuses: string[]): boolean {
    return statuses.includes(this.currentHuesped.estatus);
  }

  filteredEstatusArray(ids: number[]): any[] {
    return this.estatusArray.filter(estatus => ids.includes(estatus.id));
  }

  async onRefreshEdoCuenta(flag:boolean){
    if(flag){
      await this.getCuentas();
    }
  }

  backgroundColor(estatus:string){
    let color;

    for (let i=0;i<this.estatusArray.length;i++){
      if(estatus==this.estatusArray[i].estatus){
        color = this.estatusArray[i].color
      }
    }
    return color;
  }

  openDialog(huesped:Huesped,estatus:string) {
    const modalRef = this.modalService.open(ConfirmationModalComponent,
      {
        scrollable: true,
        windowClass: 'myCustomModalClass',
      });
  
  
    modalRef.componentInstance.huesped = huesped;
    modalRef.componentInstance.estatus = estatus;

    modalRef.result.then((result) => {
      if(result != 'Cancel'){
        this.onEstatusChange.emit({huesped,estatus});
      }
    }, (reason) => {
    });
    }

    todaysDateComparer(){
      //Disable CheckIn if the sTart Day is not today
      if(this.intialDate.setHours(0,0,0,0) == this.todayDate.setHours(0,0,0,0)) {
        return true
      }     
      else{
        return false
      }
  }

    onChangeAma(cuarto:string,estatus:string){
      this.colorAma = this.houseKeepingCodes.find((item)=> item.Descripcion === estatus)!?.Color
      const estatusDesc = this.houseKeepingCodes.find((item)=> item.Descripcion === estatus)!?.Descripcion

      this.formGroup.controls["ama"].patchValue(estatusDesc);

      this.onChangeAmaStatus.emit({cuarto,estatus})
    }

    calcSuCuenta(){
      return this.currentHuesped.porPagar!
    }

    openEnviarConfirmacion(){
      this.onOpenEnviarReservacion.emit(true)
    }

    honGetAdicionales(flag:boolean){
      if(flag){
        this.onGetAdicionales.emit(true);
      }
    }

    honGetPromesas(folio:string){
        this.onGetPromesas.emit(folio);
    }
    honEstatusAplicado(huesped:Huesped){
      this.onEstatusAplicado.emit(huesped)
    }

    honUpdateEstatusHuesped(huesped:Huesped){
      this.onUpdateEstatusHuesped.emit(huesped)
    }

    honAlertMessage(message:AlertsMessageInterface){
      this.onAlertMessage.emit(message)
    }

    honGuardarPromesa(promesa:any){
      this.onGuardarPromesa.emit(promesa);
    }

    honAgregarPago(pago:edoCuenta){
      this.onAgregarPago.emit(pago)
    }

    honFetchReservations(huesped:Huesped){
      this.onFetchReservations.emit(huesped);
    }

    saldarCuenta(){
    
      const modalRef = this.modalService.open(SaldoCuentaComponent,{size:'sm' , backdrop:'static'})
      modalRef.componentInstance.folio=this.currentHuesped.folio
      modalRef.componentInstance.saldoPendiente=this.saldoPendiente

      const sb = modalRef.componentInstance.passEntry.subscribe(() => {
        //Recibir Data del Modal usando EventEmitter
        this.checkOutfunction();
        modalRef.close();
        })

      modalRef.result.then((result) => {
        this.closeResult = `Closed with: ${result}`;
        }, (reason) => {
            this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
        });

        this.subscriptions.push(sb)
    }

    checkOutfunction(){

      this.currentHuesped.salida = new Date().toISOString();
      this.currentHuesped.pendiente = 0
      this.currentHuesped.porPagar = 0
      this.currentHuesped.noches = this.nochesReales
      this.currentHuesped.estatus = 'Check-Out';
      
      const sb = this._huespedService.updateEstatusHuesped(this.currentHuesped).subscribe({  
        next:(value)=>{
          this.onFetchReservations.emit();

          const modalRef = this.modalService.open(AlertsComponent,{ size: 'sm', backdrop:'static' })
          modalRef.componentInstance.alertHeader='EXITO'
          modalRef.componentInstance.mensaje = 'Chek-Out Realizado con Exito '
        
          this.onActualizarCuenta.emit({alojamiento_id: this.alojamiento_id, alojamientoNuevo: this.totalAlojamientoNuevo});
        },
        error:(err)=>{
          if(err){
            const modalRef=this.modalService.open(AlertsComponent,{ size: 'sm', backdrop:'static' })
            modalRef.componentInstance.alertHeader='ERROR'
            modalRef.componentInstance.mensaje = 'Ocurrio un Error al momento del Check-out intente de nuevo mas tarde'
          
              setTimeout(() => {
                modalRef.close('Close click');
              },4000)
                }
                this.isLoading=false
        },
        complete:()=>{
        }
      });
      this.subscriptions.push(sb)
    }
    
    getDismissReason(reason: any): string {
          if (reason === ModalDismissReasons.ESC) {
              return 'by pressing ESC';
          } else if (reason === ModalDismissReasons.BACKDROP_CLICK) {
              return 'by clicking on a backdrop';
          } else {
              return  `with: ${reason}`;
          }
    }

  closeModal(){
    this.modal.close();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sb => sb.unsubscribe());
  }
}

