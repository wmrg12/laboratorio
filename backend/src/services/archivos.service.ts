export const TAMANOS_PERMITIDOS = [1024, 102400, 1048576, 10485760]; // 1 KB, 100 KB, 1 MB, 10 MB

export const generarArchivo = (tamano: number) => new Uint8Array(tamano);

export const contarBytes = (datos: ArrayBuffer) => datos.byteLength;