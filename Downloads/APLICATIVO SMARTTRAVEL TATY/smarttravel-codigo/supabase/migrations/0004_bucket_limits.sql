-- Limites do bucket de vouchers no servidor (a checagem do navegador não basta).
-- 25 MB = 26214400 bytes, igual a MAX_UPLOAD_BYTES em lib/documents/upload.ts.
-- Só PDF é aceito, igual ao contentType do upload.

update storage.buckets
set allowed_mime_types = array['application/pdf'],
    file_size_limit = 26214400
where id = 'vouchers-pdf';
