const fs = require('fs');
const path = './src/screens/create-bouquet/stages/Stage3Message.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /  const \[showCustomUrlCard, setShowCustomUrlCard\] = React.useState\(false\);\n/g,
  ''
);

content = content.replace(
  /  const toggleCustomUrl = \(\) => {\n    LayoutAnimation.configureNext\(LayoutAnimation.Presets.easeInEaseOut\);\n    setShowCustomUrlCard\(!showCustomUrlCard\);\n  };\n/g,
  ''
);

fs.writeFileSync(path, content);
console.log("Removed unused state.");
