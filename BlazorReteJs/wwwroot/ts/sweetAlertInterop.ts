import swal from 'sweetalert';

export function showAlert(message: string): void {
    console.log(`Showing alert: ${message}`);
    swal(message);
}