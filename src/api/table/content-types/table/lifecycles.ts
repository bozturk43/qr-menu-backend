'use strict';

/**
 * Verilen metni URL dostu bir kimliğe çevirir.
 * Örnek: "Bahçe Masa 5" -> "bahce-masa-5"
 * @param {string} text 
 */
function generateIdentifier(text) {
  const a = 'àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;'
  const b = 'aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz------'
  const p = new RegExp(a.split('').join('|'), 'g')

  return text.toString().toLowerCase()
    .replace(/\s+/g, '-') // Boşlukları - ile değiştir
    .replace(p, c => b.charAt(a.indexOf(c))) // Özel karakterleri çevir
    .replace(/&/g, '-and-') 
    .replace(/[^\w\-]+/g, '') 
    .replace(/\-\-+/g, '-') 
    .replace(/^-+/, '') 
    .replace(/-+$/, '') 
}

export default {
  async beforeCreate(event) {
    const { data } = event.params;

    // Eğer bir 'name' gönderilmişse ama 'qr_code_identifier' gönderilmemişse...
    if (data.name && !data.qr_code_identifier) {
      console.log(`'${data.name}' için QR Identifier oluşturuluyor...`);
      
      let baseIdentifier = generateIdentifier(data.name);
      let newIdentifier = baseIdentifier;
      let counter = 1;

      // Bu kimliğin veritabanında zaten var olup olmadığını kontrol et
      while (
        await strapi.db.query('api::table.table').findOne({
          where: { qr_code_identifier: newIdentifier },
        })
      ) {
        // Eğer varsa, sonuna bir sayı ekleyerek yeni bir kimlik oluştur
        counter++;
        newIdentifier = `${baseIdentifier}-${counter}`;
      }
      
      // Benzersiz kimliği veriye ata
      data.qr_code_identifier = newIdentifier;
      console.log(`Oluşturulan yeni QR Identifier: ${data.qr_code_identifier}`);
    }
  },
};