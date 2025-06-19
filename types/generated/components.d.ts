import type { Schema, Struct } from '@strapi/strapi';

export interface LandingPageFeature extends Struct.ComponentSchema {
  collectionName: 'components_landing_page_features';
  info: {
    displayName: 'Feature';
    icon: 'star';
  };
  attributes: {
    description: Schema.Attribute.Text;
    icon: Schema.Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    title: Schema.Attribute.String;
  };
}

export interface LandingPageTestimonial extends Struct.ComponentSchema {
  collectionName: 'components_landing_page_testimonials';
  info: {
    displayName: 'Testimonial';
    icon: 'user';
  };
  attributes: {
    author_name: Schema.Attribute.String;
    author_photo: Schema.Attribute.Media<
      'images' | 'files' | 'videos' | 'audios'
    >;
    author_title: Schema.Attribute.String;
    quote: Schema.Attribute.Text;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'landing-page.feature': LandingPageFeature;
      'landing-page.testimonial': LandingPageTestimonial;
    }
  }
}
