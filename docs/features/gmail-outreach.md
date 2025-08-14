# Gmail Outreach System (Email Campaign Management)

## Overview

The Gmail Outreach System is a comprehensive email campaign management platform that enables music promoters to send professional outreach emails to artists using their Gmail account. The system integrates seamlessly with the Discovery System to create a complete workflow from artist discovery to email outreach.

## Key Features

### 🔗 **Gmail API Integration**
- **OAuth 2.0 Authentication**: Secure connection to user's Gmail account
- **Professional Email Sending**: Send emails from your actual Gmail address
- **Free Tier**: 500 emails per day at no cost
- **Automatic Token Management**: Secure storage and refresh of Gmail tokens
- **Delivery Tracking**: Monitor email delivery status and responses

### 📧 **Email Template Management**
- **Dynamic Templates**: Support for variables like `{{artistName}}`, `{{genre}}`
- **Template Types**: Initial outreach, follow-up, collaboration, thank you, rejection
- **Rich Editor**: Preview functionality with variable substitution
- **Template Library**: Pre-built professional templates
- **Variable Auto-Detection**: Automatically extract variables from content

### 🎯 **Campaign Management**
- **Artist Selection**: Import artists directly from Discovery System
- **Smart Filtering**: Filter by genre, search terms, recent contact history
- **Batch Processing**: Send multiple emails with rate limiting
- **Progress Tracking**: Real-time progress updates during sending
- **Campaign Analytics**: Track sent, delivered, opened, and replied emails

### 🔄 **Discovery System Integration**
- **Seamless Workflow**: Use scraped artist emails directly
- **Contact Validation**: Only artists with verified email addresses
- **Contact History**: Track when artists were last contacted
- **Duplicate Prevention**: Avoid contacting the same artist too frequently

---

## Architecture

### Backend Components

```
Gmail Outreach System
├── Gmail API Integration
│   ├── GmailService.ts - Core Gmail operations
│   ├── GmailTokenService.ts - Token management
│   └── OAuth flow implementation
├── Campaign Management
│   ├── OutreachController.ts - Campaign CRUD operations
│   ├── Email template management
│   └── Batch email sending
├── Database Models
│   ├── OutreachCampaign - Campaign tracking
│   ├── EmailTemplate - Template management
│   ├── EmailRecord - Individual email tracking
│   └── User settings for Gmail tokens
└── API Endpoints
    ├── /api/gmail/* - Gmail authentication
    ├── /api/outreach/campaigns/* - Campaign management
    ├── /api/outreach/templates/* - Template management
    └── /api/outreach/send - Email sending
```

### Frontend Components

```
Outreach Interface
├── Main Outreach Page
│   ├── Campaign/Template tab navigation
│   ├── Gmail connection status
│   └── Dashboard overview
├── Campaign Management
│   ├── CampaignForm.tsx - Campaign creation
│   ├── Artist selection from Discovery
│   ├── Campaign list and details
│   └── Email sending interface
├── Template Management
│   ├── TemplateForm.tsx - Template creation/editing
│   ├── Variable management
│   ├── Template preview
│   └── Template library
└── Gmail Integration
    ├── OAuth connection flow
    ├── Connection status display
    └── Account management
```

---

## User Workflow

### 1. Gmail Account Setup

**Initial Connection:**
1. Navigate to Outreach page
2. Click "Connect Gmail" button
3. OAuth popup opens for Gmail authentication
4. Grant necessary permissions:
   - Send emails on your behalf
   - Read email profile information
5. System stores encrypted tokens securely
6. Connection status updates automatically

**Required Permissions:**
- `https://www.googleapis.com/auth/gmail.send`
- `https://www.googleapis.com/auth/gmail.readonly`
- `https://www.googleapis.com/auth/userinfo.email`

### 2. Email Template Creation

**Template Structure:**
```javascript
{
  name: "Initial Artist Outreach",
  type: "INITIAL_OUTREACH",
  subject: "Music Promotion Opportunity - {{artistName}}",
  body: `Hi {{recipientName}},

I hope this email finds you well! I came across your music and I'm really impressed with your style, especially in the {{artistGenres}} genre.

I'm {{yourName}} from {{yourCompany}}, and we specialize in helping artists like yourself reach wider audiences through strategic promotion campaigns.

Would you be interested in discussing potential opportunities?

Best regards,
{{yourName}}`,
  variables: ["artistName", "recipientName", "artistGenres", "yourName", "yourCompany"]
}
```

**Variable System:**
- **Built-in Variables**: `artistName`, `recipientName`, `artistGenres`
- **Custom Variables**: Add your own variables like `yourName`, `yourCompany`
- **Auto-Detection**: System finds `{{variable}}` patterns in templates
- **Preview Mode**: See how emails will look with sample data

**Template Types:**
- **Initial Outreach**: First contact with artists
- **Follow Up**: Second attempt after no response
- **Collaboration Proposal**: Partnership opportunities
- **Thank You**: Post-collaboration appreciation
- **Rejection Response**: Professional response to declined offers

### 3. Campaign Creation

**Artist Selection Process:**
1. **Source**: Artists imported from Discovery System with verified emails
2. **Filtering Options**:
   - **Search**: Filter by artist name
   - **Genre**: Filter by musical genre
   - **Recent Contact**: Exclude/include recently contacted artists
3. **Selection**: Choose individual artists or select all visible
4. **Validation**: System confirms all selected artists have email addresses

**Campaign Configuration:**
```javascript
{
  name: "Electronic Artists Q4 2025",
  description: "Outreach to electronic music artists for winter promotions",
  templateId: "template-uuid",
  targetArtistIds: ["artist1-uuid", "artist2-uuid"],
  sendingSchedule: {
    emailsPerDay: 50,        // Respect Gmail limits
    startTime: "09:00",      // Business hours
    endTime: "17:00",
    timezone: "UTC"
  },
  scheduledStartDate: "2025-01-15T09:00:00Z",
  tags: ["electronic", "q4-2025"]
}
```

### 4. Email Sending Process

**Batch Sending Implementation:**
1. **Pre-Send Validation**:
   - Verify Gmail connection is active
   - Check template exists and is valid
   - Confirm artists have email addresses
   - Validate daily sending limits

2. **Template Processing**:
   ```javascript
   // Variable substitution for each artist
   const variables = {
     artistName: artist.displayName || artist.name,
     recipientName: artist.name,
     artistGenres: artist.genres.join(', '),
     yourName: "Your Name",
     yourCompany: "Your Company"
   };
   
   const personalizedSubject = parseTemplate(template.subject, variables);
   const personalizedBody = parseTemplate(template.body, variables);
   ```

3. **Rate-Limited Sending**:
   - **2-second delay** between each email
   - **50 email batches** maximum per request
   - **Daily limit tracking** (500 emails/day)
   - **Error handling** for failed sends

4. **Real-Time Tracking**:
   - Progress updates during sending
   - Success/failure status per email
   - Gmail message ID capture
   - Database status updates

**Email Status Tracking:**
- `DRAFT` - Email created but not sent
- `SCHEDULED` - Queued for future sending
- `SENT` - Successfully sent via Gmail
- `DELIVERED` - Gmail confirms delivery
- `OPENED` - Recipient opened email (future feature)
- `CLICKED` - Recipient clicked links (future feature)
- `REPLIED` - Recipient responded
- `BOUNCED` - Email bounced back
- `FAILED` - Sending failed

---

## Technical Implementation

### Gmail Service Architecture

**GmailService.ts Core Functions:**
```typescript
class GmailService {
  // OAuth authentication
  getAuthUrl(): string
  getTokensFromCode(code: string): Promise<GmailTokens>
  refreshTokens(): Promise<GmailTokens>
  
  // Email operations
  sendEmail(message: EmailMessage): Promise<string>
  getUserProfile(): Promise<{ email: string; name?: string }>
  isTokenValid(): Promise<boolean>
  
  // Utility functions
  parseTemplate(template: string, variables: Record<string, string>): string
  isValidEmail(email: string): boolean
  getQuotaInfo(): Promise<{ dailyLimit: number; currentUsage: number }>
}
```

**Token Management:**
```typescript
class GmailTokenService {
  // Secure token storage in database
  storeTokens(userId: string, email: string, tokens: GmailTokens): Promise<void>
  getTokens(userId: string): Promise<StoredGmailTokens | null>
  updateTokens(userId: string, tokens: Partial<GmailTokens>): Promise<void>
  removeTokens(userId: string): Promise<void>
  
  // Token validation
  hasValidTokens(userId: string): Promise<boolean>
  cleanupExpiredTokens(): Promise<number>
}
```

### Database Schema

**OutreachCampaign Model:**
```sql
CREATE TABLE outreach_campaigns (
  id                 TEXT PRIMARY KEY,
  name               TEXT NOT NULL,
  description        TEXT,
  status             TEXT DEFAULT 'DRAFT', -- DRAFT, ACTIVE, PAUSED, COMPLETED, CANCELLED
  template_id        TEXT NOT NULL,
  target_artist_ids  TEXT[], -- Array of artist IDs
  scheduled_start_date TIMESTAMP,
  scheduled_end_date TIMESTAMP,
  sending_schedule   JSONB, -- { emailsPerDay, startTime, endTime, timezone }
  tags               TEXT[] DEFAULT '{}',
  owner_id           TEXT NOT NULL,
  created_at         TIMESTAMP DEFAULT now(),
  updated_at         TIMESTAMP DEFAULT now(),
  
  FOREIGN KEY (owner_id) REFERENCES users(id),
  FOREIGN KEY (template_id) REFERENCES email_templates(id)
);
```

**EmailTemplate Model:**
```sql
CREATE TABLE email_templates (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  subject   TEXT NOT NULL,
  body      TEXT NOT NULL,
  type      TEXT NOT NULL, -- INITIAL_OUTREACH, FOLLOW_UP, etc.
  variables TEXT[] DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  owner_id  TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  FOREIGN KEY (owner_id) REFERENCES users(id)
);
```

**EmailRecord Model:**
```sql
CREATE TABLE email_records (
  id                 TEXT PRIMARY KEY,
  outreach_campaign_id TEXT NOT NULL,
  artist_id          TEXT NOT NULL,
  template_id        TEXT NOT NULL,
  recipient_email    TEXT NOT NULL,
  recipient_name     TEXT NOT NULL,
  subject            TEXT NOT NULL,
  body               TEXT NOT NULL,
  status             TEXT DEFAULT 'DRAFT', -- DRAFT, SENT, DELIVERED, etc.
  tracking           JSONB DEFAULT '{}', -- { sentAt, messageId, variables }
  scheduled_for      TIMESTAMP,
  sent_by            TEXT NOT NULL,
  reply_content      TEXT,
  notes              TEXT,
  created_at         TIMESTAMP DEFAULT now(),
  updated_at         TIMESTAMP DEFAULT now(),
  
  FOREIGN KEY (outreach_campaign_id) REFERENCES outreach_campaigns(id),
  FOREIGN KEY (artist_id) REFERENCES artists(id)
);
```

**Gmail Token Storage:**
```sql
-- Stored in user_settings table as JSON
{
  "access_token": "ya29.a0...",
  "refresh_token": "1//04...",
  "expiry_date": 1640995200000,
  "email": "user@gmail.com",
  "createdAt": "2025-01-15T10:00:00Z",
  "updatedAt": "2025-01-15T10:00:00Z"
}
```

---

## API Reference

### Gmail Authentication Endpoints

**GET `/api/gmail/auth-url`**
```javascript
// Generate OAuth URL for Gmail authentication
Response: {
  message: "Gmail auth URL generated successfully",
  data: {
    authUrl: "https://accounts.google.com/oauth2/auth?...",
    state: "user-id-for-security"
  }
}
```

**POST `/api/gmail/callback`**
```javascript
// Handle OAuth callback and store tokens
Request: {
  code: "authorization-code-from-google",
  state: "user-id-for-verification"
}

Response: {
  message: "Gmail account connected successfully",
  data: {
    email: "user@gmail.com",
    name: "User Name"
  }
}
```

**GET `/api/gmail/status`**
```javascript
// Check Gmail connection status
Response: {
  message: "Gmail status retrieved successfully",
  data: {
    isConnected: true,
    email: "user@gmail.com",
    canSendEmails: true
  }
}
```

**POST `/api/gmail/test`**
```javascript
// Send test email to verify connection
Response: {
  message: "Test email sent successfully",
  data: {
    messageId: "gmail-message-id",
    sentTo: "user@gmail.com"
  }
}
```

### Template Management Endpoints

**GET `/api/outreach/templates`**
```javascript
// Retrieve user's email templates
Response: {
  message: "Email templates retrieved successfully",
  data: [
    {
      id: "template-uuid",
      name: "Initial Artist Outreach",
      subject: "Music Promotion Opportunity - {{artistName}}",
      body: "Hi {{recipientName}}...",
      type: "INITIAL_OUTREACH",
      variables: ["artistName", "recipientName"],
      isDefault: false,
      createdAt: "2025-01-15T10:00:00Z"
    }
  ],
  count: 1
}
```

**POST `/api/outreach/templates`**
```javascript
// Create new email template
Request: {
  name: "Follow Up Template",
  subject: "Following up - {{artistName}}",
  body: "Hi {{recipientName}}, I wanted to follow up...",
  type: "FOLLOW_UP",
  variables: ["artistName", "recipientName"],
  isDefault: false
}

Response: {
  message: "Email template created successfully",
  data: { /* template object */ }
}
```

### Campaign Management Endpoints

**GET `/api/outreach/campaigns`**
```javascript
// Retrieve user's outreach campaigns with statistics
Response: {
  message: "Outreach campaigns retrieved successfully",
  data: [
    {
      id: "campaign-uuid",
      name: "Electronic Artists Q4 2025",
      description: "Outreach to electronic music artists",
      status: "ACTIVE",
      template: {
        id: "template-uuid",
        name: "Initial Artist Outreach",
        type: "INITIAL_OUTREACH"
      },
      statistics: {
        totalEmails: 25,
        sentEmails: 20,
        draftEmails: 5,
        scheduledEmails: 0,
        repliedEmails: 3
      },
      createdAt: "2025-01-15T10:00:00Z"
    }
  ],
  count: 1
}
```

**POST `/api/outreach/campaigns`**
```javascript
// Create new outreach campaign
Request: {
  name: "Electronic Artists Q4 2025",
  description: "Outreach to electronic music artists for winter promotions",
  templateId: "template-uuid",
  targetArtistIds: ["artist1-uuid", "artist2-uuid"],
  scheduledStartDate: "2025-01-15T09:00:00Z",
  sendingSchedule: {
    emailsPerDay: 50,
    startTime: "09:00",
    endTime: "17:00",
    timezone: "UTC"
  },
  tags: ["electronic", "q4-2025"]
}

Response: {
  message: "Outreach campaign created successfully",
  data: {
    /* campaign object */
    emailsCreated: 20,
    artistsSkipped: 2  // Artists without email addresses
  }
}
```

**POST `/api/outreach/send`**
```javascript
// Send emails for a campaign
Request: {
  campaignId: "campaign-uuid",
  emailIds: ["email1-uuid", "email2-uuid"] // Optional: specific emails
}

Response: {
  message: "Email sending completed",
  data: {
    campaign: "Electronic Artists Q4 2025",
    totalProcessed: 20,
    successCount: 18,
    failureCount: 2,
    results: [
      {
        emailId: "email1-uuid",
        artistName: "Artist Name",
        status: "sent",
        messageId: "gmail-message-id"
      },
      {
        emailId: "email2-uuid",
        artistName: "Artist Name 2",
        status: "failed",
        error: "Invalid email address"
      }
    ]
  }
}
```

---

## Security & Privacy

### OAuth Security
- **Secure Token Storage**: Encrypted tokens stored in database
- **Token Refresh**: Automatic refresh before expiration
- **Scope Limitation**: Only request necessary Gmail permissions
- **State Validation**: CSRF protection in OAuth flow

### Data Protection
- **Email Privacy**: Only process emails that users send themselves
- **Artist Privacy**: Only use publicly available email addresses
- **User Control**: Users can disconnect Gmail at any time
- **Data Encryption**: All sensitive data encrypted at rest

### Rate Limiting
- **Gmail Limits**: Respect 500 emails/day limit
- **Sending Delays**: 2-second delays between emails
- **Batch Limits**: Maximum 50 emails per request
- **Daily Tracking**: Monitor usage to prevent exceeding limits

---

## Performance & Scalability

### Current Performance
- **Email Sending**: ~30 emails/minute (with 2-second delays)
- **Template Processing**: <100ms per email
- **Database Queries**: Optimized with proper indexing
- **Memory Usage**: Minimal footprint per user

### Scalability Considerations
- **User Growth**: System supports multiple users simultaneously
- **Email Volume**: Can handle thousands of campaigns
- **Database Scaling**: Proper indexing on campaign and email tables
- **API Rate Limits**: Respects both Gmail and application limits

### Optimization Features
- **Batch Processing**: Send multiple emails efficiently
- **Template Caching**: Reduce template parsing overhead
- **Connection Pooling**: Efficient database connections
- **Error Recovery**: Retry failed operations

---

## Error Handling & Troubleshooting

### Common Issues

**1. Gmail Connection Failures**
- **Cause**: Expired or invalid tokens
- **Solution**: Automatic token refresh or reconnection prompt
- **User Action**: Re-authenticate if refresh fails

**2. Email Sending Failures**
- **Cause**: Rate limits, invalid email addresses, network issues
- **Solution**: Retry mechanism with exponential backoff
- **User Feedback**: Clear error messages and suggested actions

**3. Template Variable Errors**
- **Cause**: Undefined variables in templates
- **Solution**: Template validation before saving
- **Prevention**: Auto-detection and variable management

### Error Recovery
```javascript
// Automatic error recovery example
try {
  await gmailService.sendEmail(emailMessage);
} catch (error) {
  if (error.code === 401) {
    // Token expired, try refresh
    const newTokens = await gmailService.refreshTokens();
    await tokenService.updateTokens(userId, newTokens);
    // Retry sending
    await gmailService.sendEmail(emailMessage);
  } else {
    // Log error and mark email as failed
    await updateEmailStatus(emailId, 'FAILED', error.message);
  }
}
```

### Debugging Tools
- **Gmail API Console**: Monitor API usage and errors
- **Application Logs**: Detailed logging of all operations
- **Database Queries**: Track email statuses and campaign progress
- **User Feedback**: Real-time progress and error reporting

---

## Integration with Discovery System

### Data Flow
1. **Discovery Phase**: Artists found via SoundCloud scraping
2. **Email Validation**: Only artists with verified emails are available
3. **Campaign Creation**: Import artists directly into outreach campaigns
4. **Contact Tracking**: Update artist records with outreach history
5. **Response Management**: Track replies and engagement

### Artist Selection Process
```javascript
// Artist filtering for campaigns
const availableArtists = artists.filter(artist => {
  // Must have email contact info
  if (!artist.contactInfo?.email || !artist.contactInfo?.hasEmail) {
    return false;
  }
  
  // Optional: Filter recently contacted (last 30 days)
  if (!showRecentlyContacted && artist.lastContactedAt) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return new Date(artist.lastContactedAt) < thirtyDaysAgo;
  }
  
  return true;
});
```

### Contact History Tracking
- **Last Contacted**: Update when emails are sent
- **Response Tracking**: Monitor replies and engagement
- **Campaign Association**: Link artists to specific campaigns
- **Performance Metrics**: Track success rates per artist

---

## Future Enhancements

### Planned Features
1. **Advanced Analytics**
   - Email open rate tracking
   - Click-through rate monitoring
   - Response rate analysis
   - Campaign performance comparisons

2. **Email Automation**
   - Scheduled email sequences
   - Follow-up automation
   - Drip campaigns
   - A/B testing for templates

3. **Enhanced Personalization**
   - AI-powered content suggestions
   - Dynamic content based on artist genre
   - Personalized sending times
   - Sentiment analysis for responses

4. **Integration Expansions**
   - Support for other email providers
   - CRM integration
   - Calendar scheduling for follow-ups
   - Social media integration

### Scalability Improvements
1. **Background Processing**
   - Queue-based email sending
   - Scheduled campaign execution
   - Bulk operations optimization

2. **Performance Enhancements**
   - Template compilation caching
   - Database query optimization
   - CDN for static assets

3. **Enterprise Features**
   - Team collaboration
   - Role-based permissions
   - Advanced reporting
   - API access for integrations

---

## Conclusion

The Gmail Outreach System provides a comprehensive, professional solution for music promotion email campaigns. By integrating with the Discovery System and Gmail API, it creates a seamless workflow from artist discovery to successful outreach.

**Key Benefits:**
- **Free to Use**: Leverages Gmail's free 500 emails/day limit
- **Professional Quality**: Sends from user's actual Gmail account
- **Data Quality**: Only uses verified artist email addresses
- **Respectful Outreach**: Rate limiting and contact history tracking
- **Complete Workflow**: Discovery → Template → Campaign → Send → Track

The system is production-ready and provides all the tools needed for successful music promotion campaigns while maintaining ethical standards and respecting both artist privacy and email platform limitations.