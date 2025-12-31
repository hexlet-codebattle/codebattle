// This file imports static assets that need cache busting in production.
// By importing them here, Vite will process them and add them to the manifest.
// These can then be referenced in server-rendered templates using the Vite helper.

// Main logo (used in header, og images, etc.)
import '../static/images/logo.svg';

// Fight icon (used in header)
import '../static/images/fight.svg';

// Landing page images
import '../static/images/landing/github.svg';
import '../static/images/landing/flowchart.svg';
import '../static/images/landing/beginner.svg';
import '../static/images/landing/experienced.svg';
import '../static/images/landing/friends.svg';
import '../static/images/landing/enthusiast.svg';

// Landing page photos and comments
import '../static/images/landing/photo1.png';
import '../static/images/landing/photo2.png';
import '../static/images/landing/photo3.png';
import '../static/images/landing/photo4.png';
import '../static/images/landing/comment.png';
import '../static/images/landing/comment2.png';
import '../static/images/landing/comment3.png';
import '../static/images/landing/html.png';

// Landing page language icons
import '../static/images/landing/languages/clojure.svg';
import '../static/images/landing/languages/cpp.svg';
import '../static/images/landing/languages/c-sharp.svg';
import '../static/images/landing/languages/dart.svg';
import '../static/images/landing/languages/elixir.svg';
import '../static/images/landing/languages/go.svg';
import '../static/images/landing/languages/haskell.svg';
import '../static/images/landing/languages/java.svg';
import '../static/images/landing/languages/js.svg';
import '../static/images/landing/languages/kotlin.svg';
import '../static/images/landing/languages/php.svg';
import '../static/images/landing/languages/python.svg';
import '../static/images/landing/languages/ruby.svg';
import '../static/images/landing/languages/rust.svg';
import '../static/images/landing/languages/swift.svg';
import '../static/images/landing/languages/ts.svg';
import '../static/images/landing/languages/zig.svg';

// Note: Favicons are intentionally NOT imported here because:
// 1. They rarely change
// 2. Browsers expect them at fixed paths
// 3. Some tools (like manifest.json) reference them by path
