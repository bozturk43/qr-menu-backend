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

export interface LandingPageFeatureBlock extends Struct.ComponentSchema {
  collectionName: 'components_landing_page_feature_blocks';
  info: {
    displayName: 'FeatureBlock';
    icon: 'puzzle';
  };
  attributes: {
    description: Schema.Attribute.Text;
    image: Schema.Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    layout_size: Schema.Attribute.Enumeration<['small', 'large']>;
    title: Schema.Attribute.String;
  };
}

export interface LandingPagePricingTier extends Struct.ComponentSchema {
  collectionName: 'components_landing_page_pricing_tiers';
  info: {
    displayName: 'PricingTier';
    icon: 'priceTag';
  };
  attributes: {
    billing_period: Schema.Attribute.String;
    description: Schema.Attribute.Text;
    features: Schema.Attribute.Component<'landing-page.pt-feature-item', true>;
    is_featured: Schema.Attribute.Boolean;
    plan_name: Schema.Attribute.String;
    price: Schema.Attribute.String;
  };
}

export interface LandingPagePtFeatureItem extends Struct.ComponentSchema {
  collectionName: 'components_landing_page_pt_feature_items';
  info: {
    displayName: 'PTFeatureItem';
  };
  attributes: {
    text: Schema.Attribute.String;
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
      'landing-page.feature-block': LandingPageFeatureBlock;
      'landing-page.pricing-tier': LandingPagePricingTier;
      'landing-page.pt-feature-item': LandingPagePtFeatureItem;
      'landing-page.testimonial': LandingPageTestimonial;
    }
  }
}
