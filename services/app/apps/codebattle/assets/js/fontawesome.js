// FontAwesome icon library setup
import { library } from '@fortawesome/fontawesome-svg-core';
import { fab } from '@fortawesome/free-brands-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';
import { fas } from '@fortawesome/free-solid-svg-icons';

// Add all solid, regular, and brand icons to the library
// This allows using icons by string name throughout the app
library.add(fas, far, fab);
