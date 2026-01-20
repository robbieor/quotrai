import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_EMAIL = 'Quotr <noreply@quotr.info>';

const baseStyles = `
  font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  color: #1f2937;
`;

const buttonStyles = `
  display: inline-block;
  background-color: #00FFB2;
  color: #0f1419;
  padding: 14px 32px;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 700;
  font-size: 16px;
`;

const footerStyles = `
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
  color: #6b7280;
  font-size: 14px;
`;

const QUOTR_LOGO_BASE64 = '/9j/4AAQSkZJRgABAQAAkACQAAD/4QECRXhpZgAATU0AKgAAAAgABwEOAAIAAAALAAAAYgESAAMAAAABAAEAAAEaAAUAAAABAAAAbgEbAAUAAAABAAAAdgEoAAMAAAABAAIAAAEyAAIAAAAUAAAAfodpAAQAAAABAAAAkgAAAABTY3JlZW5zaG90AAAAAACQAAAAAQAAAJAAAAABMjAyNjowMToxNyAxMjoxNzozMwAABZADAAIAAAAUAAAA1JKGAAcAAAASAAAA6KABAAMAAAAB//8AAKACAAQAAAABAAACVKADAAQAAAABAAACWwAAAAAyMDI2OjAxOjE3IDEyOjE3OjMzAEFTQ0lJAAAAU2NyZWVuc2hvdP/tAG5QaG90b3Nob3AgMy4wADhCSU0EBAAAAAAANhwBWgADGyVHHAIAAAIAAhwCeAAKU2NyZWVuc2hvdBwCPAAGMTIxNzMzHAI3AAgyMDI2MDExNzhCSU0EJQAAAAAAELEsadnsw8AYm4y4GG+YH6f/4gIoSUNDX1BST0ZJTEUAAQEAAAIYYXBwbAQAAABtbnRyUkdCIFhZWiAH5gABAAEAAAAAAABhY3NwQVBQTAAAAABBUFBMAAAAAAAAAAAAAAAAAAAAAAAA9tYAAQAAAADTLWFwcGwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAApkZXNjAAAA/AAAADBjcHJ0AAABLAAAAFB3dHB0AAABfAAAABRyWFlaAAABkAAAABRnWFlaAAABpAAAABRiWFlaAAABuAAAABRyVFJDAAABzAAAACBjaGFkAAAB7AAAACxiVFJDAAABzAAAACBnVFJDAAABzAAAACBtbHVjAAAAAAAAAAEAAAAMZW5VUwAAABQAAAAcAEQAaQBzAHAAbABhAHkAIABQADNtbHVjAAAAAAAAAAEAAAAMZW5VUwAAADQAAAAcAEMAbwBwAHkAcgBpAGcAaAB0ACAAQQBwAHAAbABlACAASQBuAGMALgAsACAAMgAwADIAMlhZWiAAAAAAAAD21QABAAAAANMsWFlaIAAAAAAAAIPfAAA9v////7tYWVogAAAAAAAASr8AALE3AAAKuVhZWiAAAAAAAAAoOAAAEQsAAMi5cGFyYQAAAAAAAwAAAAJmZgAA8qcAAA1ZAAAT0AAACltzZjMyAAAAAAABDEIAAAXe///zJgAAB5MAAP2Q///7ov///aMAAAPcAADAbv/AABEIAlsCVAMBIgACEQEDEQH/xAAfAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgv/xAC1EAACAQMDAgQDBQUEBAAAAX0BAgMABBEFEiExQQYTUWEHInEUMoGRoQgjQrHBFVLR8CQzYnKCCQoWFxgZGiUmJygpKjQ1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4eLj5OXm5+jp6vHy8/T19vf4+fr/xAAfAQADAQEBAQEBAQEBAAAAAAAAAQIDBAUGBwgJCgv/xAC1EQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8/T19vf4+fr/2wBDAAICAgICAgMCAgMFAwMDBQYFBQUFBggGBgYGBggKCAgICAgICgoKCgoKCgoMDAwMDAwODg4ODg8PDw8PDw8PDw//2wBDAQIDAwQEBAcEBAcQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/3QAEACb/2gAMAwEAAhEDEQA/AP3vJxUTNSM1Qs1ACs1QM9NZ6rO9AEjPUDSVC8lVnloAnaSq7S1XaWqzS0AWmlqBpaydQ1Sy0y0lv9RuI7W2gUvJLKwREUdSzMQAB6mvjL4l/tr+BPDRm07wNbv4lv0487Jhs1POfnI3vj/ZXaez1cYOWxyV8VSoLmqyt/XY+3Gmryzxl8a/hf4C3J4o8R2lrOh2mBH864B94Yt7j6lQK/In+9h8XPiGzRanrT6fYksRa2GbaLDDBVip3uPZ2avCic8mulUe7Pk6/EC2ox+b/yR+p3iX9vDwLYvJD4X0G+1YoSFkmZLSJ/cf6x8fVAfavCNZ/bp+KN6JY9H0vTNNV/usUlmkQfVnCE/VMe1fFFFbKnFdD5+pm+Ln9u3pofQt3+1X8fLtmL+KnjB7R21qgH02xA/rXM3Xx/+NN4xabxlqSk/wDPOcxD8k215BRWvKux5zxVeXxTf3s9Jf4y/F1zk+NtbGfTUbgfyemf8Lh+Lf8A0O2uf+DK5/8Ajlec0UWRn7ap/M/vPRv+Fw/Fv/odtc/8GVz/APHKP+Fw/Fv/AKHbXP8AwZXP/wAcrzmiiyD21T+Z/eejf8Lh+Lf/AEO2uf8Agyuf/jlH/C4fi3/0O2uf+DK5/wDjlec0UWQe2qfzP7z0b/hcPxb/AOh21z/wZXP/AMco/wCFw/Fv/odtc/8ABlc//HK85oosg9tU/mf3no3/AAuH4t/9Dtrn/gyuf/jlH/C4fi3/ANDtrn/gyuf/AI5XnNFFkHtqn8z+89G/4XD8W/8Aodtc/wDBlc//AByj/hcPxb/6HbXP/Blc/wDxyvOaKLIPbVP5n956N/wuH4t/9Dtrn/gyuf8A45R/wuH4t/8AQ7a5/wCDK5/+OV5zRRZB7ap/M/vPRv8AhcPxb/6HbXP/AAZXP/xyj/hcPxb/Oh21z/WVPzyvOaKLIPbVP5n956N/wuH4t/9Dtrn/gyuf/jlH/C4fi3/0O2uf+DK5/8Ajlec0UWQe2qfzP7z0b/hcPxb/6HbXP8AwZXP/wAco/4XD8W/+h21z/AMGVz/8AHK85oosg9tU/mf3no3/C4fi3/wBDtrn/AIMrn/45R/wuH4t/9Dtrn/gyuf8A45XnNFFkHtqn8z+89G/4XD8W/wDodtc/8GVz/wDHKP8AhcPxb/6HbXPAAZXP/xyvOaKLIPbVP5n956N/ALh+Lf8A0O2uf4Mrn/45R/wuH4t/9Dtrn/gyuf8ACOV5zRRZB7ap/M/vPRv+Fw/Fv/odtc/8GVz/AOOUf8Lh+Lf/AEO2uf8Agyuf/jlec0UWQe2qfzP7z0b/AIXD8W/+h21z/wAGVz/8co/4XD8W/wDodtc/8GVz/wDHK85oosg9tU/mf3no3/C4fi3/ANDtrn/gyuf/AI5R/ALh+Lf/AEO2uf4Mrn/45XnNFFkHtqn8z+89G/4XD8W/+h21z/wZXP8A8co/4XD8W/8Aodtc/wDBlc//AByvOaKLIPbVP5n956N/wuH4t/8AQ7a5/wCDK5/+OUf8Lh+Lf/Q7a5/4Mrn/AOOV5zRRZB7ap/M/vPRv+Fw/Fv8A6HbXP/Blc/8Axyj/AIXD8W/+h21z/wAGVz/8crzmiiyD21T+Z/eejf8AC4fi3/0O2uf+DK5/+OUv/C4vi3/0O+uf+DK5/wDjlecUUWQe2qfzP7z0yL40fF+I5XxtrJ/3r+dv5ua3LP8AaJ+N1j/qPGN83/XV1l/9GBq8Xoo5V2KWIrLab+9n0ppn7XHx606ZZJEEKEvsa9Y57S3Kn6lI1f8mr17Qv29PG1vOp8SeG7C+h7i1eW2f65czD8MV8G0VDhF9DrhmOKhtN/PX8z9cPCn7b/AKKdZYQ+IYL3w/JjJeWP7RDn0DQ7n/NAK+oPCvxA8GeNbcXXhPWrTVU27iIJVd1B/vpnch9mANfz31asr29066jvdPuJLW4hO5JYnKOp9VZSCD9KzdGPQ9qhn9eOlWKkvuf+R/RwstWFlr8X/h7+2B8WfBYhstXuE8TadENvl3v+vAzni4X5yfeTfx2r79+GH7VXwu+Izw6e92dB1eTaotb4hA7kdIpQdj88AEqx/u1zSlSR9Vhs1w9fROz7P8Aqx9VrLVlZKxEmB5B4q2ktYntmwslWFeslJKtJJQBqK9Tq1ZqPVlXoAvBqlB7iqatU6tQBYyKMio8ijIoA//Q/eNmqszU52qq70AI71UeSkkepLSylvnO07UHVv6CgCi8lVHlruotLsogAYxIfVuc/h0p0ul6fMMNAo/3Rt/ligDzh5a+WfjL+1P4I+F5m0bTCNf9QplTbQuBFAwOD58oyFIx9wZb1Cg5rR/bEsfjFoXgV9T+GcgXRI1J1R4N39oRR8jcpHAhA++y/OvXIQMa/FxmLEsxyTySe9dVOmnqz5HNc0qUJeypRs+7/Q9Q+JPxk+IHxWvPP8W6kz2ytuis4cx2sRAwCseTk4J+ZiW564ry6iiu1K2x+fTnKcnKbuwooopmQUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQB9K/CT9qP4ifC9oNNuJjr2gxYX7HdOS0aAYAgl5aPHZSGXHRR1r9TvhX8bPAnxb077V4WvxccXcS7p7KbCXMPTJZMnK5IG9SV7ZzxX4OVqaLrer+HNUt9a0K8lsL60YPFNCxR1YehH6joRwaxlSUj6LBZtVw9oy96Pb/I/oxSWriSV8CfAD9rvTvF7W3hH4lPFputttjgvfuW923AAftHK34Ix4G04U/dkclcEouLsz9Gw+KpYiHPTd/0NpJKto9Y8clXI5Kg7DVVqsK1ZyPVpGoAu7qN1RBuKXdQB/9H91XaqUjVLI1UJHoAYzFmCjqTgV3FtAltAsK/wjk+p7muDglVbuFm6B1J+ma9FoAKKKKAGMoYFWGQeCD3r8jf2t/2R38LtefFH4W2bPozlptR06Jc/YyeWmhUf8sOpZR/q+o+ThP11qNlWRSjgFWGCDyCDWkJuLujz8bg6eKp8k9+j7H8uVFfo1+1v+yQfCpvPij8LbL/iR4Muo6dEMmzOctNCv/NDuyj/AFfUfu+E/OWvSjJSV0fk+Jw1TD1HTmv+CFFFFUcYUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFffn7Nf7Vtxoclr4C+J92ZdMOI7PUpWy9uf4Y52PWP0cnKdDleU+A6KmUVJWZ3YbFVMPU9pTf8AwT+j6CdJEWSNgysAQQcgg9CDWjHJX5W/spftKSaHcWnww8fXWdMlKxabeSHm3c8LBI3/ADzPRD/AeD8pGz9RY5K82cHF2Z+q4LGU8VT9pD5rsbUb1cRqyI3q9G9ZnommGGKXcKrBuKXcKAP/0v3Fkas+VqsStWbK1AFeWTblicY5zUvwz+Lfgr4pQ6mnhTUo72fQ7hrW6VSM7l4Ei4J3RPg7HHDYOOlfE37X/wAa38EeHF8BeHbjZreuxkzuh+a3szlWIIOQ8pBVf9kMeDtNfmx8N/iR4q+FPiy08ZeDrr7Pe2uVZGy0U8TffilUEbkbEYyCDgghgCOqFLmjc+Xxmbxw+IVNK6Xxf8/8pUorw/4HfHHwn8c/Cqa5oTi31G3CLqFgzZltZWH4bo2wdjgYYcHDBlHeFczTTsz6SnUhUgpwd0wooopGhEyrIpRwGVhgg8gg9jX5Hftc/skN4Va9+KXwwtM6IxMuoabCv/HmTy00Kj/lhnllH+r6j5OE/XamEBwVYZB4INaQm4u6POxmCp4qnyT+T7H8uVFfo3+1v+yO3hdrv4o/C2zZ9GcvNqWnRDP2Pu00Kj/lh1LKP9X1HycJ+clelGSkro/KMThqmHqOnNf8EKKKKo4wooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFffn7Nf7Vtxoclr4C+J92ZdMOI7PUpWy9uf4Y52PWP0cnKdDleU+A6KmUVJWZ3YbFVMPU9pTf8AwT+j6CdJEWSNgysAQQcgg9CDWjHJX5W/spftKSaHcWnww8fXWdMlKxabeSHm3c8LBI3/ADzPRD/AeD8pGz9RY5K82cHF2Z+q4LGU8VT9pD5rsbUb1cRqyI3q9G9ZnommGGKXcKrBuKXcKAP/0v3Fkas+VqsStWbK1AFeWTblicY5zUvwz+Lfgr4pQ6mnhTUo72fQ7hrW6VSM7l4Ei4J3RPg7HHDYOOlfE37X/wAa38EeHF8BeHbjZreuxkzuh+a3szlWIIOQ8pBVf9kMeDtNfmx8N/iR4q+FPiy08ZeDrr7Pe2uVZGy0U8TffilUEbkbEYyCDgghgCOqFLmjc+Xxmbxw+IVNK6Xxf8/8pUorw/4HfHHwn8c/Cqa5oTi31G3CLqFgzZltZWH4bo2wdjgYYcHDBlHeFczTTsz6SnUhUgpwd0wooopGhEyrIpRwGVhgg8gg9jX5Hftc/skN4Va9+KXwwtM6IxMuoabCv/HmTy00Kj/lhnllH+r6j5OE/XamEBwVYZB4INaQm4u6POxmCp4qnyT+T7H8uVFfo3+1v+yO3hdrv4o/C2zZ9GcvNqWnRDP2Pu00Kj/lh1LKP9X1HycJ+clelGSkro/KMThqmHqOnNf8EKKKKo4wooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAK/Vb9kT4/t4w01Phr4uuQ2t6bF/oU0jfNd26D7hJPzSxj8WQZPKsT+VNamia1qnhzV7PXtFuGtL6wlWaGVDgq6HIP8AiOhHB4rOUFJWPSwOMnhaqqR26ruj+jGJ60I3rw34KfFPTvi34EsvFNrtiux+5vYF/wCWNygG9QMk7TkMmT90jPOa9oievMas7M/XqdSNSCnB3TNZW4pd1VVbil3UjQ//0/22lauI8a+LNJ8E+GNT8V63II7LTIWmfkAsR91Fz1Z2wqjuxArr5Wr80/25fia7Tab8K9MmwoC32obWHJORBE2OeMFyD6oa0hHmlY8/HYlYajKr16ep8K+OfGOreP8AxZqfi/W33XWpTGQjORGnRI1/2UUBR7D1rk6KK9RI/HpScm5S3Z3nw3+JPi34U+KrXxh4NvDa3tv8rqfminiJBaKVONyNjkdQcEEMAR+8vwP+OHhP46eFBrugN9mv7bal/YSMDLbSkfhujbB2OBhgCCAwZR/O9XefDb4j+KvhV4stPGHg+7NteWpw6HJiniJG6KVQRuRscjqDgghgCMZ01JeZ7WW5lPCzs9Yvdfqj+lSivEPgf8cfCvxy8Jpr2hMLXUbfCX+nu4aW1lP5bo2xlHwAw4OGDKPb685pp2Z+p06kKkFODumFFFFI0GMqyKUcBlYYIPIINfkb+1x+yOfCpvPij8LbP/iR4DLqOnRAk2ZzlpoV/54d2Uf6vqP3fCfnLXpRkpK6PyfE4aph6jpzX/BCj+kr9kT4/t4w01Phr4uuQ2t6bF/oU0jfNd26D7hJPzSxj8WQZPKsT+VNamia1qnhzV7PXtFuGtL6wlWaGVDgq6HIP8AiOhHB4rOUFJWPSwOMnhaqqR26ruj+jGJ60I3rw34KfFPTvi34EsvFNrtiux+5vYF/wCWNygG9QMk7TkMmT90jPOa9oievMas7M/XqdSNSCnB3TNZW4pd1VVbil3UjQ//0/22lauI8a+LNJ8E+GNT8V63II7LTIWmfkAsR91Fz1Z2wqjuxArr5Wr80/25fia7Tab8K9MmwoC32obWHJORBE2OeMFyD6oa0hHmlY8/HYlYajKr16ep8K+OfGOreP8AxZqfi/W33XWpTGQjORGnRI1/2UUBR7D1rk6KK9RI/HpScm5S3Z3nw3+JPi34U+KrXxh4NvDa3tv8rqfminiJBaKVONyNjkdQcEEMAR+8vwP+OHhP46eFBrugN9mv7bal/YSMDLbSkfhujbB2OBhgCCAwZR/O9XefDb4j+KvhV4stPGHg+7NteWpw6HJiniJG6KVQRuRscjqDgghgCMZ01JeZ7WW5lPCzs9Yvdfqj+lSivEPgf8cfCvxy8Jpr2hMLXUbfCX+nu4aW1lP5bo2xlHwAw4OGDKPb685pp2Z+p06kKkFODumFFFFI0GMqyKUcBlYYIPIINfkb+1x+yOfCpvPij8LbP/iR4DLqOnRAk2ZzlpoV/54d2Uf6vqP3fCfnLXpRkpK6PyfE4aph6jpzX/BCv3f8A+CfI/wCLG6mOf+Q9df8ApNbV+EFfvB/wT4JHwN1M/wDYeuv/AEmtqxr/AAnt8P8A+9r0Z92R/WpwaqI9TK1ecfpBeSpwTVZSKmDY5oAmUmp0NQBqlVs0AWI6tRVUjap0egC8lWFqkj1OktAF5KsyVkI9WKAL7VC3NMjfpVpGoAdGnpVhRTInFWEIoAmXmngGmgmpBQAylp2KMUAFFLRQAyin0vFAERFGKkooAjwaMGpKKAI8GjaafooArsrVGYmNXAKfQBmNavVZ4WNbO0UzaKALm0UbRUp603digBm0UHFPpiigAooooAKKKKACiiigAooooAKKKKACiiigD4I/4KFf8AJENM/wCw9a/+k1zX4vV+z3/BCX/kiGm/9h61/wDSa5r8Ya9Cj8J+Y55/vT9UFFFFanihRRRRQAUUUUAFFFFABRRRQB//2Q==';

function getEmailTemplate(content: string, preheader: string = ''): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quotr</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc;">
  <!-- Preheader text (hidden but shows in email previews) -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${preheader}
  </div>
  
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);">
          <!-- Header with teal brand bar -->
          <tr>
            <td style="background-color: #0A7E9E; padding: 28px 40px; text-align: center;">
              <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td style="vertical-align: middle;">
                    <img src="data:image/jpeg;base64,${QUOTR_LOGO_BASE64}" alt="Quotr" style="height: 36px; width: 36px; border-radius: 8px; display: block;" />
                  </td>
                  <td style="vertical-align: middle; padding-left: 12px;">
                    <span style="color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.3px; ${baseStyles}">Quotr</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px; ${baseStyles}">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f8fafc; border-top: 1px solid #e5e7eb; ${footerStyles}">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px; text-align: center;">
                This email was sent by Quotr, your business management platform.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                If you didn't request this email, you can safely ignore it.
              </p>
            </td>
          </tr>
        </table>
        
        <!-- Legal footer -->
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin-top: 24px;">
          <tr>
            <td align="center" style="color: #9ca3af; font-size: 12px; ${baseStyles}">
              <p style="margin: 0;">
                Quotr - Professional Invoicing & Business Tools for SMBs
              </p>
              <p style="margin: 8px 0 0;">
                Built by Revamo-FZ-LLC
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

export async function sendVerificationEmail(email: string, token: string, companyName?: string): Promise<boolean> {
  if (!resend) {
    console.log('[Email] Resend not configured. Verification token:', token);
    return false;
  }

  const domain = process.env.EXPO_PUBLIC_DOMAIN || 'quotr.work';
  const verificationUrl = `https://${domain}/verify?token=${token}`;

  const content = `
    <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 24px; font-weight: 600;">
      Verify Your Email
    </h2>
    
    <p style="margin: 0 0 24px; color: #4b5563;">
      Welcome to Quotr${companyName ? ` for ${companyName}` : ''}! Please verify your email address to get started with your business management platform.
    </p>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="${verificationUrl}" style="${buttonStyles}">
        Verify Email Address
      </a>
    </div>
    
    <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px;">
      Or copy and paste this link into your browser:
    </p>
    <p style="margin: 8px 0 0; word-break: break-all; color: #0A7E9E; font-size: 14px;">
      ${verificationUrl}
    </p>
    
    <p style="margin: 24px 0 0; color: #9ca3af; font-size: 13px;">
      This link expires in 24 hours.
    </p>
  `;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Verify your Quotr account',
      html: getEmailTemplate(content, 'Verify your email to start using Quotr'),
    });

    if (error) {
      console.error('[Email] Failed to send verification email:', error);
      return false;
    }

    console.log('[Email] Verification email sent to:', email);
    return true;
  } catch (error) {
    console.error('[Email] Error sending verification email:', error);
    return false;
  }
}

export async function sendWelcomeEmail(email: string, companyName?: string, subscriptionTier?: string): Promise<boolean> {
  if (!resend) {
    console.log('[Email] Resend not configured. Welcome email skipped for:', email);
    return false;
  }

  const domain = process.env.EXPO_PUBLIC_DOMAIN || 'quotr.work';
  const loginUrl = `https://${domain}`;

  const tierLabels: Record<string, string> = {
    starter: 'Starter',
    professional: 'Professional',
    business: 'Business',
  };

  const tierPrices: Record<string, string> = {
    starter: '€49/month',
    professional: '€99/month',
    business: '€199/month',
  };

  const tierLabel = subscriptionTier ? tierLabels[subscriptionTier] || subscriptionTier : null;
  const tierPrice = subscriptionTier ? tierPrices[subscriptionTier] : null;

  const subscriptionSection = tierLabel ? `
    <div style="background-color: #fef3c7; border-radius: 8px; padding: 20px; margin: 24px 0; border-left: 4px solid #F59E0B;">
      <h3 style="margin: 0 0 8px; color: #92400e; font-size: 16px; font-weight: 600;">
        Your Plan: ${tierLabel}${tierPrice ? ` (${tierPrice})` : ''}
      </h3>
      <p style="margin: 0; color: #78350f; font-size: 14px;">
        You're on a 14-day free trial. After the trial period, you'll be billed automatically.
      </p>
    </div>
  ` : '';

  const content = `
    <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 24px; font-weight: 600;">
      Welcome to Quotr!
    </h2>
    
    <p style="margin: 0 0 24px; color: #4b5563;">
      Your email has been verified and your account${companyName ? ` for ${companyName}` : ''} is now active. You're all set to start managing your business more efficiently.
    </p>
    
    ${subscriptionSection}
    
    <div style="background-color: #f0fdfa; border-radius: 8px; padding: 24px; margin: 24px 0;">
      <h3 style="margin: 0 0 16px; color: #0A7E9E; font-size: 16px; font-weight: 600;">
        Get Started with Quotr:
      </h3>
      <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
        <li style="margin-bottom: 8px;">Create and send professional invoices</li>
        <li style="margin-bottom: 8px;">Track expenses and scan receipts</li>
        <li style="margin-bottom: 8px;">Manage clients and quotes</li>
        <li style="margin-bottom: 8px;">Generate VAT and financial reports</li>
        <li style="margin-bottom: 0;">Track time with GPS verification</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="${loginUrl}" style="${buttonStyles}">
        Open Quotr
      </a>
    </div>
    
    <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px;">
      Need help getting started? Check out our quick start guide or contact our support team.
    </p>
  `;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Welcome to Quotr - Your account is ready!',
      html: getEmailTemplate(content, 'Your Quotr account is now active'),
    });

    if (error) {
      console.error('[Email] Failed to send welcome email:', error);
      return false;
    }

    console.log('[Email] Welcome email sent to:', email);
    return true;
  } catch (error) {
    console.error('[Email] Error sending welcome email:', error);
    return false;
  }
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
  if (!resend) {
    console.log('[Email] Resend not configured. Password reset token:', token);
    return false;
  }

  const domain = process.env.EXPO_PUBLIC_DOMAIN || 'quotr.work';
  const resetUrl = `https://${domain}/reset-password/${token}`;

  const content = `
    <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 24px; font-weight: 600;">
      Reset Your Password
    </h2>
    
    <p style="margin: 0 0 24px; color: #4b5563;">
      We received a request to reset your password. Click the button below to create a new password.
    </p>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="${resetUrl}" style="${buttonStyles}">
        Reset Password
      </a>
    </div>
    
    <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px;">
      Or copy and paste this link into your browser:
    </p>
    <p style="margin: 8px 0 0; word-break: break-all; color: #0A7E9E; font-size: 14px;">
      ${resetUrl}
    </p>
    
    <div style="background-color: #fef3c7; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <p style="margin: 0; color: #92400e; font-size: 14px;">
        <strong>Security Notice:</strong> This link expires in 1 hour. If you didn't request a password reset, please ignore this email or contact support if you're concerned about your account security.
      </p>
    </div>
  `;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Reset your Quotr password',
      html: getEmailTemplate(content, 'Reset your Quotr password'),
    });

    if (error) {
      console.error('[Email] Failed to send password reset email:', error);
      return false;
    }

    console.log('[Email] Password reset email sent to:', email);
    return true;
  } catch (error) {
    console.error('[Email] Error sending password reset email:', error);
    return false;
  }
}

export async function sendTeamInviteEmail(
  email: string,
  inviterName: string,
  organizationName: string,
  inviteCode: string,
  role: string
): Promise<boolean> {
  if (!resend) {
    console.log('[Email] Resend not configured. Invite code:', inviteCode);
    return false;
  }

  const domain = process.env.EXPO_PUBLIC_DOMAIN || 'quotr.work';
  const inviteUrl = `https://${domain}/join?code=${inviteCode}`;

  const roleDisplay = role.charAt(0).toUpperCase() + role.slice(1);

  const content = `
    <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 24px; font-weight: 600;">
      You're Invited to Join ${organizationName}
    </h2>
    
    <p style="margin: 0 0 24px; color: #4b5563;">
      ${inviterName} has invited you to join <strong>${organizationName}</strong> on Quotr as a <strong>${roleDisplay}</strong>.
    </p>
    
    <div style="background-color: #f0fdfa; border-radius: 8px; padding: 24px; margin: 24px 0;">
      <p style="margin: 0; color: #4b5563; font-size: 14px;">
        <strong>Organization:</strong> ${organizationName}<br/>
        <strong>Your Role:</strong> ${roleDisplay}<br/>
        <strong>Invited by:</strong> ${inviterName}
      </p>
    </div>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="${inviteUrl}" style="${buttonStyles}">
        Accept Invitation
      </a>
    </div>
    
    <p style="margin: 24px 0 0; color: #9ca3af; font-size: 13px;">
      This invitation expires in 7 days.
    </p>
  `;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `You're invited to join ${organizationName} on Quotr`,
      html: getEmailTemplate(content, `${inviterName} invited you to join ${organizationName}`),
    });

    if (error) {
      console.error('[Email] Failed to send invite email:', error);
      return false;
    }

    console.log('[Email] Team invite email sent to:', email);
    return true;
  } catch (error) {
    console.error('[Email] Error sending invite email:', error);
    return false;
  }
}

export function isEmailConfigured(): boolean {
  return !!resend;
}

export async function sendPasswordChangeEmail(email: string): Promise<boolean> {
  if (!resend) {
    console.log('[Email] Resend not configured. Password change notification skipped for:', email);
    return false;
  }

  const domain = process.env.EXPO_PUBLIC_DOMAIN || 'quotr.work';
  const contactUrl = `https://${domain}/contact`;

  const content = `
    <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 24px; font-weight: 600;">
      Password Changed Successfully
    </h2>
    
    <p style="margin: 0 0 24px; color: #4b5563;">
      The password for your Quotr account has been successfully changed.
    </p>
    
    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <p style="margin: 0; color: #4b5563; font-size: 14px;">
        If you did not make this change, please contact support immediately to secure your account.
      </p>
    </div>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="${contactUrl}" style="${buttonStyles}">
        Contact Support
      </a>
    </div>
  `;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Your Quotr password has been changed',
      html: getEmailTemplate(content, 'Security notification: Password changed'),
    });

    if (error) {
      console.error('[Email] Failed to send password change email:', error);
      return false;
    }

    console.log('[Email] Password change email sent to:', email);
    return true;
  } catch (error) {
    console.error('[Email] Error sending password change email:', error);
    return false;
  }
}

export async function sendMigrationRequestEmail(email: string, details: string): Promise<boolean> {
  if (!resend) {
    console.log('[Email] Resend not configured. Migration request skipped for:', email);
    return false;
  }

  const content = `
    <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 24px; font-weight: 600;">
      Data Migration Request Received
    </h2>
    
    <p style="margin: 0 0 24px; color: #4b5563;">
      We have received your request for data migration. Our support team will review your request and get back to you shortly.
    </p>
    
    <div style="background-color: #f0fdfa; border-radius: 8px; padding: 24px; margin: 24px 0;">
      <h3 style="margin: 0 0 16px; color: #0A7E9E; font-size: 16px; font-weight: 600;">
        Request Details:
      </h3>
      <p style="margin: 0; color: #4b5563; font-size: 14px; white-space: pre-wrap;">
        ${details}
      </p>
    </div>
    
    <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px;">
      Ticket Reference: #MIG-${Date.now().toString().slice(-6)}
    </p>
  `;

  try {
    // Send confirmation to user
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Data Migration Request Received',
      html: getEmailTemplate(content, 'We received your migration request'),
    });

    console.log('[Email] Migration request email sent to:', email);
    return true;
  } catch (error) {
    console.error('[Email] Error sending migration request email:', error);
    return false;
  }
}

const ADMIN_EMAIL = 'contact@quotr.info';
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'accounts@quotr.info';

export async function sendAdminEscalationRequestEmail(
  requesterEmail: string,
  requesterName: string,
  targetUserEmail: string,
  targetUserName: string,
  organizationName: string,
  reason?: string
): Promise<boolean> {
  if (!resend) {
    console.log('[Email] Resend not configured. Admin escalation request for:', targetUserEmail);
    return false;
  }

  const content = `
    <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 24px; font-weight: 600;">
      Admin Escalation Request
    </h2>
    
    <p style="margin: 0 0 24px; color: #4b5563;">
      A request to escalate a user to admin role requires your approval.
    </p>
    
    <div style="background-color: #f0fdfa; border-radius: 8px; padding: 24px; margin: 24px 0;">
      <h3 style="margin: 0 0 16px; color: #0A7E9E; font-size: 16px; font-weight: 600;">
        Request Details:
      </h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 140px;">Organization:</td>
          <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${organizationName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Requested By:</td>
          <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${requesterName} (${requesterEmail})</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">User to Escalate:</td>
          <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${targetUserName} (${targetUserEmail})</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Requested Role:</td>
          <td style="padding: 8px 0; color: #111827; font-weight: 500;">Admin</td>
        </tr>
        ${reason ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280; vertical-align: top;">Reason:</td>
          <td style="padding: 8px 0; color: #1f2937;">${reason}</td>
        </tr>
        ` : ''}
      </table>
    </div>
    
    <div style="background-color: #fef3c7; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <p style="margin: 0; color: #92400e; font-size: 14px;">
        <strong>Action Required:</strong> Please review this request in the Quotr admin panel and approve or deny it.
      </p>
    </div>
  `;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: SUPER_ADMIN_EMAIL,
      subject: `Admin Escalation Request - ${organizationName}`,
      html: getEmailTemplate(content, `Admin escalation request for ${targetUserEmail}`),
    });

    if (error) {
      console.error('[Email] Failed to send admin escalation request email:', error);
      return false;
    }

    console.log('[Email] Admin escalation request email sent for:', targetUserEmail);
    return true;
  } catch (error) {
    console.error('[Email] Error sending admin escalation request email:', error);
    return false;
  }
}

export async function sendAdminEscalationResultEmail(
  recipientEmail: string,
  recipientName: string,
  targetUserEmail: string,
  targetUserName: string,
  organizationName: string,
  approved: boolean,
  notes?: string
): Promise<boolean> {
  if (!resend) {
    console.log('[Email] Resend not configured. Admin escalation result for:', targetUserEmail);
    return false;
  }

  const statusColor = approved ? '#059669' : '#DC2626';
  const statusText = approved ? 'Approved' : 'Denied';
  const statusBgColor = approved ? '#d1fae5' : '#fee2e2';

  const content = `
    <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 24px; font-weight: 600;">
      Admin Escalation Request ${statusText}
    </h2>
    
    <p style="margin: 0 0 24px; color: #4b5563;">
      The admin escalation request for ${targetUserName} at ${organizationName} has been ${statusText.toLowerCase()}.
    </p>
    
    <div style="background-color: ${statusBgColor}; border-radius: 8px; padding: 24px; margin: 24px 0; border-left: 4px solid ${statusColor};">
      <h3 style="margin: 0 0 8px; color: ${statusColor}; font-size: 18px; font-weight: 600;">
        Status: ${statusText}
      </h3>
      <p style="margin: 0; color: #4b5563;">
        <strong>User:</strong> ${targetUserName} (${targetUserEmail})<br/>
        <strong>Organization:</strong> ${organizationName}
        ${approved ? '<br/><strong>New Role:</strong> Admin' : ''}
      </p>
      ${notes ? `
      <p style="margin: 16px 0 0; color: #4b5563;">
        <strong>Notes:</strong> ${notes}
      </p>
      ` : ''}
    </div>
    
    ${approved ? `
    <p style="margin: 24px 0 0; color: #4b5563;">
      The user now has admin privileges and can manage team members, settings, and other organizational resources.
    </p>
    ` : ''}
  `;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: recipientEmail,
      subject: `Admin Escalation ${statusText} - ${organizationName}`,
      html: getEmailTemplate(content, `Admin escalation ${statusText.toLowerCase()} for ${targetUserName}`),
    });

    if (error) {
      console.error('[Email] Failed to send admin escalation result email:', error);
      return false;
    }

    console.log('[Email] Admin escalation result email sent to:', recipientEmail);
    return true;
  } catch (error) {
    console.error('[Email] Error sending admin escalation result email:', error);
    return false;
  }
}

export async function sendDataMigrationNotification(
  userEmail: string,
  organizationName: string,
  sourceApps: string[],
  organizationId: string
): Promise<boolean> {
  if (!resend) {
    console.log('[Email] Resend not configured. Data migration request from:', userEmail, 'Apps:', sourceApps);
    return false;
  }

  const appNames: Record<string, string> = {
    tradify: 'Tradify',
    invoice_simple: 'Invoice Simple',
    quickbooks: 'QuickBooks',
    xero: 'Xero',
    excel: 'Excel/Spreadsheets',
  };

  const formattedApps = sourceApps.map(app => appNames[app] || app).join(', ');

  const content = `
    <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 24px; font-weight: 600;">
      New Data Migration Request
    </h2>
    
    <p style="margin: 0 0 24px; color: #4b5563;">
      A new customer has requested data migration assistance during onboarding.
    </p>
    
    <div style="background-color: #f0fdfa; border-radius: 8px; padding: 24px; margin: 24px 0;">
      <h3 style="margin: 0 0 16px; color: #0A7E9E; font-size: 16px; font-weight: 600;">
        Request Details:
      </h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 140px;">Customer Email:</td>
          <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${userEmail}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Organization:</td>
          <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${organizationName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Organization ID:</td>
          <td style="padding: 8px 0; color: #1f2937; font-family: monospace; font-size: 12px;">${organizationId}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Source Apps:</td>
          <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${formattedApps}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Requested At:</td>
          <td style="padding: 8px 0; color: #1f2937;">${new Date().toLocaleString('en-IE', { dateStyle: 'full', timeStyle: 'short' })}</td>
        </tr>
      </table>
    </div>
    
    <div style="background-color: #fef3c7; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <p style="margin: 0; color: #92400e; font-size: 14px;">
        <strong>Action Required:</strong> Please reach out to the customer within 24-48 hours to discuss their data migration needs and provide a quote for the service.
      </p>
    </div>
  `;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `New Data Migration Request - ${organizationName}`,
      html: getEmailTemplate(content, `Data migration request from ${userEmail}`),
    });

    if (error) {
      console.error('[Email] Failed to send data migration notification:', error);
      return false;
    }

    console.log('[Email] Data migration notification sent for:', organizationName);
    return true;
  } catch (error) {
    console.error('[Email] Error sending data migration notification:', error);
    return false;
  }
}

export async function sendTeamMemberWelcomeEmail(
  email: string,
  memberName: string,
  organizationName: string,
  role: string,
  inviterName: string
): Promise<boolean> {
  if (!resend) {
    console.log('[Email] Resend not configured. Team welcome email skipped for:', email);
    return false;
  }

  const domain = process.env.EXPO_PUBLIC_DOMAIN || 'quotr.work';
  const loginUrl = `https://${domain}`;
  const roleDisplay = role.charAt(0).toUpperCase() + role.slice(1);

  const roleDescriptions: Record<string, string> = {
    admin: 'You have full access to manage team members, clients, invoices, and all business data.',
    staff: 'You can create and manage your own time entries, expenses, and assigned tasks.',
    viewer: 'You have read-only access to view business data and reports.',
  };

  const roleDescription = roleDescriptions[role] || 'You have access to the organization.';

  const content = `
    <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 24px; font-weight: 600;">
      Welcome to ${organizationName}!
    </h2>
    
    <p style="margin: 0 0 24px; color: #4b5563;">
      Great news! You've successfully joined <strong>${organizationName}</strong> on Quotr. ${inviterName} added you to the team.
    </p>
    
    <div style="background-color: #f0fdfa; border-radius: 8px; padding: 24px; margin: 24px 0;">
      <h3 style="margin: 0 0 12px; color: #0A7E9E; font-size: 16px; font-weight: 600;">
        Your Role: ${roleDisplay}
      </h3>
      <p style="margin: 0; color: #4b5563; font-size: 14px;">
        ${roleDescription}
      </p>
    </div>
    
    <div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; margin: 24px 0;">
      <h3 style="margin: 0 0 16px; color: #1f2937; font-size: 16px; font-weight: 600;">
        What You Can Do:
      </h3>
      <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
        <li style="margin-bottom: 8px;">Clock in/out with GPS verification</li>
        <li style="margin-bottom: 8px;">Track your time and expenses</li>
        <li style="margin-bottom: 8px;">View assigned jobs and tasks</li>
        <li style="margin-bottom: 0;">Collaborate with your team</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="${loginUrl}" style="${buttonStyles}">
        Open Quotr
      </a>
    </div>
    
    <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px;">
      Questions? Contact your team admin or reach out to our support team.
    </p>
  `;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Welcome to ${organizationName} on Quotr`,
      html: getEmailTemplate(content, `You've joined ${organizationName} on Quotr`),
    });

    if (error) {
      console.error('[Email] Failed to send team member welcome email:', error);
      return false;
    }

    console.log('[Email] Team member welcome email sent to:', email);
    return true;
  } catch (error) {
    console.error('[Email] Error sending team member welcome email:', error);
    return false;
  }
}

export async function sendInviteWithAccountSetup(
  email: string,
  inviterName: string,
  organizationName: string,
  inviteCode: string,
  role: string
): Promise<boolean> {
  if (!resend) {
    console.log('[Email] Resend not configured. Invite with setup code:', inviteCode);
    return false;
  }

  const domain = process.env.EXPO_PUBLIC_DOMAIN || 'quotr.work';
  const setupUrl = `https://${domain}/join?code=${inviteCode}&setup=true`;
  const roleDisplay = role.charAt(0).toUpperCase() + role.slice(1);

  const content = `
    <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 24px; font-weight: 600;">
      You're Invited to Join ${organizationName}
    </h2>
    
    <p style="margin: 0 0 24px; color: #4b5563;">
      ${inviterName} has invited you to join <strong>${organizationName}</strong> on Quotr as a <strong>${roleDisplay}</strong>.
    </p>
    
    <div style="background-color: #f0fdfa; border-radius: 8px; padding: 24px; margin: 24px 0;">
      <p style="margin: 0; color: #4b5563; font-size: 14px;">
        <strong>Organization:</strong> ${organizationName}<br/>
        <strong>Your Role:</strong> ${roleDisplay}<br/>
        <strong>Invited by:</strong> ${inviterName}
      </p>
    </div>
    
    <p style="margin: 0 0 16px; color: #4b5563;">
      Click the button below to create your account and join the team in one step:
    </p>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="${setupUrl}" style="${buttonStyles}">
        Set Up Your Account
      </a>
    </div>
    
    <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px;">
      Or copy and paste this link into your browser:
    </p>
    <p style="margin: 8px 0 0; word-break: break-all; color: #0A7E9E; font-size: 14px;">
      ${setupUrl}
    </p>
    
    <p style="margin: 24px 0 0; color: #9ca3af; font-size: 13px;">
      This invitation expires in 7 days.
    </p>
  `;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `You're invited to join ${organizationName} on Quotr`,
      html: getEmailTemplate(content, `${inviterName} invited you to join ${organizationName}`),
    });

    if (error) {
      console.error('[Email] Failed to send invite with setup email:', error);
      return false;
    }

    console.log('[Email] Invite with account setup email sent to:', email);
    return true;
  } catch (error) {
    console.error('[Email] Error sending invite with setup email:', error);
    return false;
  }
}

export async function sendTrialExpiryReminder(
  email: string,
  companyName: string,
  daysRemaining: number,
  tier: string
): Promise<boolean> {
  if (!resend) {
    console.log('[Email] Resend not configured. Trial reminder skipped for:', email);
    return false;
  }

  const domain = process.env.EXPO_PUBLIC_DOMAIN || 'quotr.work';
  const subscribeUrl = `https://${domain}/settings/subscription`;

  const tierLabels: Record<string, string> = {
    starter: 'Starter (€49/month)',
    professional: 'Professional (€99/month)',
    business: 'Business (€199/month)',
  };

  const tierLabel = tierLabels[tier] || tier;
  const isExpired = daysRemaining <= 0;
  const isUrgent = daysRemaining <= 3;

  const urgencyColor = isExpired ? '#dc2626' : isUrgent ? '#f59e0b' : '#0A7E9E';
  const urgencyBg = isExpired ? '#fef2f2' : isUrgent ? '#fef3c7' : '#f0f9ff';

  const statusMessage = isExpired
    ? `Your free trial has expired. Your account is now in read-only mode.`
    : daysRemaining === 1
      ? `Your free trial expires tomorrow!`
      : `Your free trial expires in ${daysRemaining} days.`;

  const content = `
    <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 24px; font-weight: 600;">
      ${isExpired ? 'Your Trial Has Expired' : 'Trial Expiring Soon'}
    </h2>
    
    <div style="background-color: ${urgencyBg}; border-left: 4px solid ${urgencyColor}; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <p style="margin: 0; color: ${isExpired ? '#991b1b' : isUrgent ? '#92400e' : '#0369a1'}; font-size: 16px; font-weight: 500;">
        ${statusMessage}
      </p>
    </div>
    
    <p style="margin: 0 0 16px; color: #4b5563;">
      Hi there,
    </p>
    
    <p style="margin: 0 0 24px; color: #4b5563;">
      ${isExpired
      ? `Your Quotr account for <strong>${companyName}</strong> is now in read-only mode. All your data is safe and accessible, but you won't be able to create new invoices, quotes, or expenses until you subscribe.`
      : `We hope you've been enjoying Quotr for <strong>${companyName}</strong>. To continue using all features without interruption, please subscribe to your selected plan.`
    }
    </p>
    
    <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <h3 style="margin: 0 0 12px; color: #1f2937; font-size: 16px; font-weight: 600;">
        Your Selected Plan
      </h3>
      <p style="margin: 0; color: #0A7E9E; font-size: 18px; font-weight: 600;">
        ${tierLabel}
      </p>
      <p style="margin: 8px 0 0; color: #6b7280; font-size: 14px;">
        14-day free trial included with all plans
      </p>
    </div>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="${subscribeUrl}" style="${buttonStyles}">
        ${isExpired ? 'Reactivate My Account' : 'Subscribe Now'}
      </a>
    </div>
    
    <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px;">
      ${isExpired
      ? 'Once you subscribe, your account will be immediately reactivated with full access to all your data.'
      : 'Questions? Simply reply to this email and we\'ll be happy to help.'
    }
    </p>
  `;

  const subject = isExpired
    ? `Action Required: Your Quotr trial has expired`
    : daysRemaining <= 3
      ? `Urgent: Your Quotr trial expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`
      : `Reminder: Your Quotr trial expires in ${daysRemaining} days`;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject,
      html: getEmailTemplate(content, statusMessage),
    });

    if (error) {
      console.error('[Email] Failed to send trial reminder:', error);
      return false;
    }

    console.log(`[Email] Trial reminder sent to ${email} (${daysRemaining} days remaining)`);
    return true;
  } catch (error) {
    console.error('[Email] Error sending trial reminder:', error);
    return false;
  }
}

export async function sendBetaAccessApprovalEmail(
  email: string,
  contactName: string,
  companyName: string,
  inviteToken: string
): Promise<boolean> {
  if (!resend) {
    console.log('[Email] Resend not configured. Beta invite token:', inviteToken);
    return false;
  }

  const domain = process.env.EXPO_PUBLIC_DOMAIN || 'quotr.work';
  const registrationUrl = `https://${domain}/register?invite=${inviteToken}`;

  const content = `
    <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 24px; font-weight: 600;">
      Welcome to Quotr Beta!
    </h2>
    
    <p style="margin: 0 0 16px; color: #4b5563;">
      Hi ${contactName},
    </p>
    
    <p style="margin: 0 0 24px; color: #4b5563;">
      Great news! Your beta access request for <strong>${companyName}</strong> has been approved. 
      You're now part of an exclusive group of Irish tradespeople helping shape the future of business management.
    </p>
    
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <p style="margin: 0; color: #166534; font-weight: 600;">
        What's included in your beta access:
      </p>
      <ul style="margin: 12px 0 0; color: #166534; padding-left: 20px;">
        <li>Full access to all Quotr features - completely free during beta</li>
        <li>AI-powered receipt scanning and invoice creation</li>
        <li>Client management and time tracking</li>
        <li>Direct support from the Quotr team</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="${registrationUrl}" style="${buttonStyles}">
        Set Up Your Company Account
      </a>
    </div>
    
    <p style="margin: 24px 0 8px; color: #6b7280; font-size: 14px;">
      Or copy and paste this link into your browser:
    </p>
    <p style="margin: 0; word-break: break-all; color: #0A7E9E; font-size: 13px;">
      ${registrationUrl}
    </p>
    
    <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px;">
      This invitation link expires in 7 days. If you have any questions, just reply to this email.
    </p>
  `;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `You're In! Your Quotr Beta Access is Approved`,
      html: getEmailTemplate(content, `Your beta access for ${companyName} has been approved!`),
    });

    if (error) {
      console.error('[Email] Failed to send beta approval:', error);
      return false;
    }

    console.log(`[Email] Beta approval sent to ${email} for ${companyName}`);
    return true;
  } catch (error) {
    console.error('[Email] Error sending beta approval:', error);
    return false;
  }
}

export async function sendBetaAccessRequestNotification(
  requestDetails: {
    email: string;
    contactName: string;
    companyName: string;
    tradeType: string;
    teamSize?: string;
    message?: string;
  }
): Promise<boolean> {
  if (!resend) {
    console.log('[Email] Resend not configured. New beta request:', requestDetails.email);
    return false;
  }

  const content = `
    <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 24px; font-weight: 600;">
      New Beta Access Request
    </h2>
    
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 140px;">Company:</td>
          <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${requestDetails.companyName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Contact:</td>
          <td style="padding: 8px 0; color: #1f2937;">${requestDetails.contactName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Email:</td>
          <td style="padding: 8px 0; color: #1f2937;">${requestDetails.email}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Trade:</td>
          <td style="padding: 8px 0; color: #1f2937;">${requestDetails.tradeType}</td>
        </tr>
        ${requestDetails.teamSize ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Team Size:</td>
          <td style="padding: 8px 0; color: #1f2937;">${requestDetails.teamSize}</td>
        </tr>
        ` : ''}
      </table>
    </div>
    
    ${requestDetails.message ? `
    <div style="margin: 24px 0;">
      <p style="margin: 0 0 8px; color: #6b7280; font-weight: 600;">Message:</p>
      <p style="margin: 0; color: #4b5563; background-color: #f8fafc; padding: 16px; border-radius: 8px; font-style: italic;">
        "${requestDetails.message}"
      </p>
    </div>
    ` : ''}
    
    <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px;">
      Log in to your Super Admin dashboard to review and approve this request.
    </p>
  `;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: 'accounts@quotr.info',
      subject: `New Beta Request: ${requestDetails.companyName}`,
      html: getEmailTemplate(content, `New beta access request from ${requestDetails.companyName}`),
    });

    if (error) {
      console.error('[Email] Failed to send beta request notification:', error);
      return false;
    }

    console.log(`[Email] Beta request notification sent for ${requestDetails.companyName}`);
    return true;
  } catch (error) {
    console.error('[Email] Error sending beta request notification:', error);
    return false;
  }
}

export async function sendNewAccountNotification(accountDetails: {
  email: string;
  companyName?: string;
  organizationCode: string;
  signupIp?: string | null;
  isFoundingMember?: boolean;
  foundingMemberNumber?: number | null;
  foundingMemberLimit?: number;
}): Promise<boolean> {
  if (!resend) {
    console.log('[Email] Resend not configured, skipping new account notification');
    return false;
  }

  const signupDate = new Date().toLocaleString('en-IE', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Europe/Dublin',
  });

  const foundingMemberBadge = accountDetails.isFoundingMember && accountDetails.foundingMemberNumber
    ? `<div style="background: linear-gradient(135deg, #D4AF37 0%, #F4D03F 100%); color: #1f2937; padding: 12px 20px; border-radius: 8px; margin-bottom: 24px; text-align: center;">
        <span style="font-size: 18px; font-weight: 700;">Founding Member #${accountDetails.foundingMemberNumber}/${accountDetails.foundingMemberLimit || 150}</span>
        <br><span style="font-size: 13px; opacity: 0.9;">25% discount for 6 months on Professional/Business plans</span>
      </div>`
    : '';

  const content = `
    <h2 style="color: #0F6F66; margin: 0 0 24px;">New Account Created</h2>
    
    ${foundingMemberBadge}
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6;">
      A new account has been registered on Quotr.
    </p>
    
    <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 140px;">Email:</td>
          <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">${accountDetails.email}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Company Name:</td>
          <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">${accountDetails.companyName || 'Not provided'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Organization Code:</td>
          <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">${accountDetails.organizationCode}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Account Type:</td>
          <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">${accountDetails.isFoundingMember ? 'Founding Member' : 'Standard'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Signup Date:</td>
          <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">${signupDate}</td>
        </tr>
        ${accountDetails.signupIp ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">IP Address:</td>
          <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">${accountDetails.signupIp}</td>
        </tr>
        ` : ''}
      </table>
    </div>
    
    <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px;">
      You can view this account in the Super Admin dashboard.
    </p>
  `;

  const subjectPrefix = accountDetails.isFoundingMember
    ? `Founding Member #${accountDetails.foundingMemberNumber}/${accountDetails.foundingMemberLimit || 150}: `
    : '';

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: 'accounts@quotr.info',
      subject: `${subjectPrefix}${accountDetails.companyName || accountDetails.email}`,
      html: getEmailTemplate(content, `New account registration`),
    });

    if (error) {
      console.error('[Email] Failed to send new account notification:', error);
      return false;
    }

    console.log(`[Email] New account notification sent for ${accountDetails.email} (Founding Member: ${accountDetails.isFoundingMember})`);
    return true;
  } catch (error) {
    console.error('[Email] Error sending new account notification:', error);
    return false;
  }
}
