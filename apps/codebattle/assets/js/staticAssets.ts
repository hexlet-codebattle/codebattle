// This file imports static assets that need cache busting in production.
// By importing them here, Vite will process them and add them to the manifest.
// These can then be referenced in server-rendered templates using the Vite helper.

// Main logo (used in header, og images, etc.)
import '../static/images/logo.svg?url';

// Fight icon (used in header)
import '../static/images/fight.svg?url';

// Landing page images
import '../static/images/landing/github.svg?url';
import '../static/images/landing/flowchart.svg?url';
import '../static/images/landing/beginner.svg?url';
import '../static/images/landing/experienced.svg?url';
import '../static/images/landing/friends.svg?url';
import '../static/images/landing/enthusiast.svg?url';

// Landing page photos and comments
import '../static/images/landing/photo1.png?url';
import '../static/images/landing/photo2.png?url';
import '../static/images/landing/photo3.png?url';
import '../static/images/landing/photo4.png?url';
import '../static/images/landing/comment.png?url';
import '../static/images/landing/comment2.png?url';
import '../static/images/landing/comment3.png?url';
import '../static/images/landing/html.png?url';

// Landing page language icons
import '../static/images/landing/languages/clojure.svg?url';
import '../static/images/landing/languages/cpp.svg?url';
import '../static/images/landing/languages/c-sharp.svg?url';
import '../static/images/landing/languages/dart.svg?url';
import '../static/images/landing/languages/elixir.svg?url';
import '../static/images/landing/languages/go.svg?url';
import '../static/images/landing/languages/java.svg?url';
import '../static/images/landing/languages/js.svg?url';
import '../static/images/landing/languages/kotlin.svg?url';
import '../static/images/landing/languages/php.svg?url';
import '../static/images/landing/languages/python.svg?url';
import '../static/images/landing/languages/ruby.svg?url';
import '../static/images/landing/languages/rust.svg?url';
import '../static/images/landing/languages/swift.svg?url';
import '../static/images/landing/languages/ts.svg?url';
import '../static/images/landing/languages/zig.svg?url';

// Note: Favicons are intentionally NOT imported here because:
// 1. They rarely change
// 2. Browsers expect them at fixed paths
// 3. Some tools (like manifest.json) reference them by path
