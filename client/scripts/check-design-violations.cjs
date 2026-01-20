#!/usr/bin/env node

/**
 * Quotr Design System Violation Scanner
 * 
 * This script scans the codebase for design guideline violations:
 * - Hardcoded hex colors outside theme files
 * - Hardcoded pixel values (optional, future)
 * - Non-standard font usage (optional, future)
 * 
 * Usage: node scripts/check-design-violations.js [--fix]
 */

const fs = require('fs');
const path = require('path');

// Colors for terminal output
const colors = {
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    green: '\x1b[32m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
    bold: '\x1b[1m',
};

// Files/directories to skip
const SKIP_PATTERNS = [
    /node_modules/,
    /\.git/,
    /dist/,
    /build/,
    /theme\//,
    /theme\\/,
    /variables\.css$/,
    /tokens\.ts$/,
];

// Allowed hex colors in theme (from design_guidelines.md)
const THEME_COLORS = new Set([
    '#0B6E87', '#3D8FA3', '#084E61', // Primary
    '#D97706', '#F59E0B', '#B45309', // Accent
    '#059669', '#DC2626',            // Success, Error
    '#F5F5F5', '#FFFFFF',            // Background, Surface
    '#D1D5DB', '#E5E7EB',            // Borders
    '#111827', '#4B5563', '#9CA3AF', // Text
]);

// Hex color regex
const HEX_COLOR_REGEX = /#([0-9a-fA-F]{3,8})\b/g;

// Violation severity levels
const SEVERITY = {
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
};

// Store violations
const violations = [];

function shouldSkipFile(filePath) {
    return SKIP_PATTERNS.some((pattern) => pattern.test(filePath));
}

function getFileExtension(filePath) {
    return path.extname(filePath).toLowerCase();
}

function isSourceFile(filePath) {
    const ext = getFileExtension(filePath);
    return ['.tsx', '.ts', '.jsx', '.js', '.css'].includes(ext);
}

function calculateSeverity(color, filePath) {
    // High severity: completely non-standard colors
    const normalizedColor = color.toUpperCase();
    if (THEME_COLORS.has(normalizedColor)) {
        return SEVERITY.LOW; // Color exists in theme but used directly
    }

    // Medium severity: close to theme colors (typos)
    // High severity: completely different colors
    return filePath.includes('Page') ? SEVERITY.HIGH : SEVERITY.MEDIUM;
}

function scanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
        let match;
        while ((match = HEX_COLOR_REGEX.exec(line)) !== null) {
            const color = match[0];
            const lineNumber = index + 1;
            const column = match.index + 1;
            const severity = calculateSeverity(color, filePath);

            violations.push({
                file: filePath,
                line: lineNumber,
                column,
                color,
                severity,
                context: line.trim().substring(0, 80),
            });
        }
        // Reset regex lastIndex
        HEX_COLOR_REGEX.lastIndex = 0;
    });
}

function scanDirectory(dirPath) {
    if (shouldSkipFile(dirPath)) return;

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (shouldSkipFile(fullPath)) continue;

        if (entry.isDirectory()) {
            scanDirectory(fullPath);
        } else if (entry.isFile() && isSourceFile(fullPath)) {
            scanFile(fullPath);
        }
    }
}

function getSeverityLabel(severity) {
    switch (severity) {
        case SEVERITY.HIGH:
            return `${colors.red}HIGH${colors.reset}`;
        case SEVERITY.MEDIUM:
            return `${colors.yellow}MEDIUM${colors.reset}`;
        case SEVERITY.LOW:
            return `${colors.cyan}LOW${colors.reset}`;
        default:
            return 'UNKNOWN';
    }
}

function getRecommendation(color) {
    const normalizedColor = color.toUpperCase();

    // Map common colors to CSS variables
    const colorMap = {
        '#0D9488': 'var(--color-primary)',
        '#0F766E': 'var(--color-primary-dark)',
        '#14B8A6': 'var(--color-primary-light)',
        '#10B981': 'var(--color-success)',
        '#059669': 'var(--color-success)',
        '#EF4444': 'var(--color-error)',
        '#DC2626': 'var(--color-error)',
        '#F59E0B': 'var(--color-warning)',
        '#D97706': 'var(--color-warning) or var(--color-accent)',
        '#64748B': 'var(--color-text-secondary)',
        '#475569': 'var(--color-text-secondary)',
        '#0F172A': 'var(--color-text-primary)',
        '#1E293B': 'var(--color-text-primary)',
        '#111827': 'var(--color-text-primary)',
        '#4B5563': 'var(--color-text-secondary)',
        '#9CA3AF': 'var(--color-text-disabled)',
        '#94A3B8': 'var(--color-text-disabled)',
        '#E2E8F0': 'var(--color-border) or var(--color-border-subtle)',
        '#D1D5DB': 'var(--color-border)',
        '#E5E7EB': 'var(--color-border-subtle)',
        '#F1F5F9': 'var(--color-background)',
        '#F8FAFC': 'var(--color-background)',
        '#F5F5F5': 'var(--color-background)',
        '#FFFFFF': 'var(--color-surface)',
        '#FEFCE8': 'var(--color-status-sent-bg)',
        '#FEF3C7': 'var(--color-status-sent-bg)',
        '#DCFCE7': 'var(--color-status-paid-bg)',
        '#FEE2E2': 'var(--color-status-overdue-bg)',
        '#3B82F6': 'var(--color-accent) - consider using theme accent',
        '#6366F1': 'var(--color-accent) - map to theme accent',
        '#8B5CF6': 'var(--color-accent) - map to theme accent',
    };

    return colorMap[normalizedColor] || 'Add to theme or use existing variable';
}

function printReport() {
    console.log(`\n${colors.bold}╔══════════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bold}║           QUOTR DESIGN SYSTEM VIOLATION REPORT                   ║${colors.reset}`);
    console.log(`${colors.bold}╚══════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

    if (violations.length === 0) {
        console.log(`${colors.green}✓ No design violations found!${colors.reset}\n`);
        return;
    }

    // Sort by severity (highest first), then by file
    violations.sort((a, b) => {
        if (b.severity !== a.severity) return b.severity - a.severity;
        return a.file.localeCompare(b.file);
    });

    // Group by severity
    const highSeverity = violations.filter((v) => v.severity === SEVERITY.HIGH);
    const mediumSeverity = violations.filter((v) => v.severity === SEVERITY.MEDIUM);
    const lowSeverity = violations.filter((v) => v.severity === SEVERITY.LOW);

    console.log(`${colors.bold}Summary:${colors.reset}`);
    console.log(`  ${colors.red}HIGH:${colors.reset}   ${highSeverity.length} violations`);
    console.log(`  ${colors.yellow}MEDIUM:${colors.reset} ${mediumSeverity.length} violations`);
    console.log(`  ${colors.cyan}LOW:${colors.reset}    ${lowSeverity.length} violations`);
    console.log(`  ${colors.bold}TOTAL:${colors.reset}  ${violations.length} violations\n`);

    // Print top 20 violations
    console.log(`${colors.bold}Top 20 Violations (ranked by severity):${colors.reset}\n`);

    violations.slice(0, 20).forEach((v, index) => {
        const relativePath = path.relative(process.cwd(), v.file);
        console.log(`${colors.bold}${index + 1}.${colors.reset} [${getSeverityLabel(v.severity)}] ${relativePath}:${v.line}:${v.column}`);
        console.log(`   Color: ${colors.cyan}${v.color}${colors.reset}`);
        console.log(`   Recommendation: ${colors.green}${getRecommendation(v.color)}${colors.reset}`);
        console.log(`   Context: ${v.context.substring(0, 60)}...`);
        console.log('');
    });

    // Group by file for full report
    console.log(`\n${colors.bold}Violations by File:${colors.reset}\n`);

    const byFile = new Map();
    violations.forEach((v) => {
        const relativePath = path.relative(process.cwd(), v.file);
        if (!byFile.has(relativePath)) {
            byFile.set(relativePath, []);
        }
        byFile.get(relativePath).push(v);
    });

    byFile.forEach((fileViolations, file) => {
        console.log(`  ${file}: ${fileViolations.length} violations`);
    });

    console.log(`\n${colors.yellow}Run with --fix to generate a migration guide.${colors.reset}\n`);
}

// Main execution
const srcPath = path.join(__dirname, '..', 'src');

console.log(`${colors.cyan}Scanning for design violations in: ${srcPath}${colors.reset}`);
scanDirectory(srcPath);
printReport();

// Exit with error code if violations found (for CI)
if (violations.length > 0) {
    process.exit(1);
}
