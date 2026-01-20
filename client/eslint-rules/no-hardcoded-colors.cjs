/**
 * Custom ESLint rule to prevent hardcoded hex colors
 * Only allows hex colors in src/theme/* files
 */

module.exports = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow hardcoded hex colors outside of theme files',
            category: 'Best Practices',
            recommended: true,
        },
        fixable: null,
        schema: [],
        messages: {
            noHardcodedColors:
                'Hardcoded color "{{color}}" found. Use CSS variables from theme instead (e.g., var(--color-primary)).',
        },
    },

    create(context) {
        const filename = context.getFilename();

        // Allow hex colors in theme files
        if (filename.includes('/theme/') || filename.includes('\\theme\\')) {
            return {};
        }

        // Also allow in index.css where variables are defined
        if (filename.endsWith('index.css') || filename.endsWith('variables.css')) {
            return {};
        }

        // Regex pattern for hex colors
        const hexColorRegex = /#([0-9a-fA-F]{3,8})\b/g;

        function checkForHexColors(node, value) {
            if (typeof value !== 'string') return;

            let match;
            while ((match = hexColorRegex.exec(value)) !== null) {
                const color = match[0];
                // Skip common non-color hex patterns (like color: inherit, etc.)
                if (color.length >= 4) {
                    context.report({
                        node,
                        messageId: 'noHardcodedColors',
                        data: { color },
                    });
                }
            }
            // Reset regex lastIndex for next use
            hexColorRegex.lastIndex = 0;
        }

        return {
            // Check JSX attributes (style props)
            JSXAttribute(node) {
                if (node.name.name === 'style' && node.value && node.value.expression) {
                    const styleValue = node.value.expression;
                    if (styleValue.type === 'ObjectExpression') {
                        styleValue.properties.forEach((prop) => {
                            if (prop.value && prop.value.type === 'Literal') {
                                checkForHexColors(prop.value, prop.value.value);
                            }
                            if (prop.value && prop.value.type === 'TemplateLiteral') {
                                prop.value.quasis.forEach((quasi) => {
                                    checkForHexColors(quasi, quasi.value.raw);
                                });
                            }
                        });
                    }
                }
                // Check color prop
                if (node.name.name === 'color' && node.value && node.value.type === 'Literal') {
                    checkForHexColors(node.value, node.value.value);
                }
            },

            // Check Literal strings for hex colors
            Literal(node) {
                // Only check if it's actually a color-like string
                if (typeof node.value === 'string' && node.value.startsWith('#')) {
                    const parent = node.parent;
                    // Skip imports and requires
                    if (parent.type === 'ImportDeclaration' || parent.type === 'CallExpression') {
                        return;
                    }
                    checkForHexColors(node, node.value);
                }
            },

            // Check template literals
            TemplateLiteral(node) {
                node.quasis.forEach((quasi) => {
                    checkForHexColors(quasi, quasi.value.raw);
                });
            },
        };
    },
};
