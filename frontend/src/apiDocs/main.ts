// /public_api/docs (PublicApi.V1.SpecController): Swagger UI over our OpenAPI spec, bundled
// and served from our origin instead of a CDN, so visitors' browsers talk only to us.
import 'swagger-ui-dist/swagger-ui.css';

import SwaggerUI from 'swagger-ui-dist/swagger-ui-es-bundle.js';

SwaggerUI({
  url: '/public_api/v1/openapi.json',
  dom_id: '#swagger-ui',
  // The default posts our spec URL to validator.swagger.io for a badge.
  validatorUrl: null,
});
