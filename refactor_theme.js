const fs = require('fs');
const path = require('path');

const screensDir = path.join(__dirname, 'src', 'screens');
const files = fs.readdirSync(screensDir).filter(f => f.endsWith('.js'));

files.forEach(file => {
  const filePath = path.join(screensDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Replace import
  if (content.includes("import { colors } from '../theme';")) {
    content = content.replace(
      "import { colors } from '../theme';",
      "import { useTheme } from '../contexts/ThemeContext';"
    );
  } else if (content.includes('import { colors } from "../theme";')) {
    content = content.replace(
      'import { colors } from "../theme";',
      "import { useTheme } from '../contexts/ThemeContext';"
    );
  } else {
    // If it doesn't import colors, skip
    console.log(`Skipping ${file} - no colors import`);
    return;
  }

  // 2. Modify StyleSheet.create
  // Find `const styles = StyleSheet.create({`
  content = content.replace(
    /const\s+styles\s*=\s*StyleSheet\.create\(\{/g,
    'const createStyles = (colors) => StyleSheet.create({'
  );

  // 3. Inject hooks into the main exported function
  // We look for `export default function ComponentName(...) {`
  const funcRegex = /export\s+default\s+function\s+[A-Za-z0-9_]+\s*\([^)]*\)\s*\{/;
  const match = content.match(funcRegex);
  
  if (match) {
    const insertPos = match.index + match[0].length;
    const injection = `\n  const { colors } = useTheme();\n  const styles = createStyles(colors);\n`;
    content = content.slice(0, insertPos) + injection + content.slice(insertPos);
  } else {
    console.log(`Could not find main function in ${file}`);
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Refactored ${file}`);
});
