
export interface Bloqueo
{
  _id?:string;
  Habitacion:string;
  Cuarto:Array<string>;
  Desde:Date;
  Hasta:Date;
  bloqueoState: BloqueosState;
  Comentarios:string;
  hotel?:string;
}

export interface BloqueosState {
  [key: string]: boolean;
};

