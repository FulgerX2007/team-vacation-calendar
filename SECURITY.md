# Security Policy

## Supported Versions

This is a static web application deployed via GitHub Pages. Only the latest version deployed from the `master` branch is supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| Latest (master) | :white_check_mark: |
| Older versions  | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it responsibly:

### Preferred Method: GitHub Security Advisories

1. Go to the [Security tab](../../security/advisories) of this repository
2. Click "Report a vulnerability"
3. Provide detailed information about the vulnerability

### Alternative Method: GitHub Issues

For non-critical issues, you can [open a GitHub Issue](../../issues/new) with the label "security".

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial assessment**: Within 7 days
- **Resolution**: Depending on severity and complexity

## Security Considerations

This application has a minimal attack surface due to its architecture:

### What This Application Does NOT Have

- No backend server or server-side code
- No user authentication or accounts
- No database or server-side data storage
- No cookies or session management
- No user-generated content sharing between users

### Data Storage

- All data is stored in your browser's LocalStorage
- Data never leaves your browser (except holiday API requests)
- Data is browser-specific and device-specific
- Clearing browser data will delete all stored information

### External Communications

- **Open Holidays API** (`openholidaysapi.org`): HTTPS requests for national holiday data
- **Flatpickr CDN** (`cdn.jsdelivr.net`): Date picker library loaded via HTTPS
- No other external API calls or data transmission

## Known Limitations

1. **LocalStorage is not encrypted**: Data stored in LocalStorage is accessible to any JavaScript running on the same origin. This is acceptable for non-sensitive vacation scheduling data.

2. **No cross-device sync**: Since data is stored locally, it does not sync between browsers or devices.

3. **JSON import trust**: When importing JSON backup files, the application trusts the file structure. Only import files from trusted sources.

## Best Practices for Users

1. **Use HTTPS**: Always access the application via `https://` (GitHub Pages enforces this by default)

2. **Trusted imports only**: Only import JSON backup files that you exported yourself or received from a trusted source

3. **Browser security**: Keep your browser updated to ensure LocalStorage and Canvas APIs have the latest security patches

4. **Shared computers**: If using a shared computer, be aware that LocalStorage data persists until manually cleared

## Third-Party Dependencies

| Dependency | Source | Purpose |
| ---------- | ------ | ------- |
| Flatpickr | jsdelivr CDN | Date picker UI component |
| Roboto Font | Bundled | Typography |
| Open Holidays API | openholidaysapi.org | National holiday data |

All external resources are loaded via HTTPS.
