import { Injectable } from '@nestjs/common';
import { UploadApiResponse, v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  private UploadSingleFile(
    file: Express.Multer.File,
    folder: string,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      // cloudinary.uploader.upload_stream cria um stream de upload
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder, // 'products' → salvará em cloudinary.com/console/.../products/
          resource_type: 'auto', // Detecta automaticamente se é imagem, vídeo, etc.

          // Transformações aplicadas no upload (opcional)
          transformation: [
            {
              width: 1000,
              height: 1000,
              crop: 'limit', // Redimensiona SÓ se for maior que 1000x1000
            },
            { quality: 'auto' }, // Cloudinary escolhe a melhor qualidade
            { fetch_format: 'auto' }, // Converte para WebP se o browser suportar
          ],
        },
        (error, result) => {
          // Callback executado quando upload termina
          if (error) return reject(error); // Se houver erro, rejeita a Promise
          resolve(result); // Se sucesso, resolve com o resultado
        },
      );

      // file.buffer contém os bytes da imagem em memória
      // .end() envia os dados e finaliza o stream
      uploadStream.end(file.buffer);
    });
  }

  async UploadMultipleImages(
    files: Express.Multer.File[],
    folder: string = 'uploads',
  ): Promise<UploadApiResponse[]> {
    return Promise.all(
      files.map((file) => this.UploadSingleFile(file, folder)),
    );
  }

  async DeleteMultipleImages(publicIds: string[]): Promise<any> {
    return cloudinary.api.delete_resources(publicIds);
  }

  // Útil para extrair o public_id de uma URL do Cloudinary
  ExtractPublicId(url: string): string {
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    const publicId = filename.split('.')[0];
    const folder = parts[parts.length - 2];
    return `${folder}/${publicId}`;
  }
}
