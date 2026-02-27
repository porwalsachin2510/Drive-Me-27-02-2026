# Corporate Employee Invitation & Password Setup Flow

## Overview
The CORPORATE_EMPLOYEE invitation system is a **passwordless invitation** flow that allows corporate admins to add employees without setting passwords for them. Employees receive an invitation email with a unique token link to set their own password.

---

## Step-by-Step Flow

### 1. **Corporate Admin Adds Employee**
- Navigate to: `/corporate/employee-management`
- Click "+ Add Employee" or "Bulk Upload"
- Fill employee details (name, email, department, designation, transport details, etc.)
- Click "Add Employee" or upload CSV

**Backend Action:**
- User account created with:
  - ✅ Random temporary password (hashed, not shown to anyone)
  - ✅ `isPasswordSet: false` (marks that employee needs to set password)
  - ✅ `role: "CORPORATE_EMPLOYEE"`
- CorporateEmployee record created with full details

### 2. **Corporate Admin Sends Invitation**
- Go to employee list table
- Select employees (checkboxes)
- Click "Send Invitations" button
- Confirm the action

**Backend Action:**
- For each employee:
  - Generate a unique `passwordSetupToken` (valid for 7 days)
  - Store token in User document: `passwordSetupToken` and `passwordSetupTokenExpiry`
  - Send HTML email with:
    - ✅ Employee name and email
    - ✅ Employee ID
    - ✅ Department
    - ✅ **"Set Your Password" button** with token link

### 3. **Employee Receives Invitation Email**
Email contains:
```
Subject: "You are invited to join Corporate Transport - DriveMe"

Body:
- Welcome message
- Account details (Email, Employee ID, Department)
- **"Set Your Password" button** → https://yourapp.com/set-password?token=xyz...
- Fallback link if button doesn't work
- Message: "This link will expire in 7 days"
```

### 4. **Employee Sets Password**
- Employee clicks "Set Your Password" button in email
- Redirected to: `/set-password?token=xyz...`

**Frontend Page (SetPassword.jsx):**
```
1. Token validation
   - Validates token with backend
   - Displays employee name and email if valid
   
2. Password form
   - New Password field
   - Confirm Password field
   - Both must match, min 6 characters
   
3. Submit
   - Backend updates user:
     - Sets password (hashed via pre-save hook)
     - Sets `isPasswordSet = true`
     - Sets `isEmailVerified = true`
     - Clears token and expiry
   - Returns JWT token
   - Auto-login happens
   - Redirects to dashboard after 2 seconds
```

### 5. **Employee Can Now Login**
After setting password, employee can:
- ✅ Login with email and password
- ✅ Access dashboard based on their role
- ✅ Book/track corporate rides
- ✅ Access all CORPORATE_EMPLOYEE features

---

## API Endpoints

### Send Invitations (Corporate Admin)
```
POST /api/corporate-employees/send-invitations
Headers: Authorization: Bearer {token}
Body: {
  "employeeIds": ["emp1_id", "emp2_id", ...]
}

Response:
{
  "success": true,
  "message": "Invitations sent: X successful, Y failed",
  "data": {
    "results": {
      "sent": [...],
      "failed": [...]
    }
  }
}
```

### Validate Password Token (Employee)
```
GET /api/auth/validate-password-token/:token

Response:
{
  "success": true,
  "message": "Token is valid",
  "data": {
    "email": "employee@company.com",
    "fullName": "John Doe"
  }
}
```

### Set Password (Employee)
```
POST /api/auth/set-password
Body: {
  "token": "xyz...",
  "password": "newpassword",
  "confirmPassword": "newpassword"
}

Response:
{
  "success": true,
  "message": "Password set successfully! You can now login.",
  "token": "jwt_token",
  "user": { ...user details... }
}
```

---

## Token Management

### Token Generation
- Generated in `sendInvitationEmails()` function
- Format: 64-character hex string (crypto.randomBytes(32))
- Storage: Stored in User document
  - `passwordSetupToken`: The token string
  - `passwordSetupTokenExpiry`: Expiry date (7 days from creation)

### Token Validation
- Valid only if:
  - Token matches `passwordSetupToken` in database
  - Current time < `passwordSetupTokenExpiry`
  - Endpoint: `GET /api/auth/validate-password-token/:token`

### Token Cleanup
- Automatically cleared after password is set
- Tokens expire after 7 days (invalid after expiry)
- Employee can request new invitation if link expires

---

## Error Scenarios & Solutions

### 1. **Employee Clicks Link After 7 Days**
**Error:** "Invalid or expired token. Please contact your corporate admin for a new invitation."
**Solution:** Corporate admin resends invitation → new token generated

### 2. **Invalid Token in URL**
**Error:** Same as above
**Solution:** Check email for correct link, or request new invitation

### 3. **Passwords Don't Match**
**Error:** "Passwords do not match."
**Solution:** Confirm password fields match exactly

### 4. **Password Too Short**
**Error:** "Password must be at least 6 characters long."
**Solution:** Enter a password with at least 6 characters

### 5. **Email Not Received**
**Solution:**
- Check spam/junk folder
- Check email address is correct in employee management
- Request corporate admin to resend invitation
- Check SMTP email service is configured (environment variables)

---

## User Experience Flow (Timeline)

```
Day 0 - 10:00 AM
├─ Corporate Admin: Adds employee "john@company.com"
└─ Backend: Creates user with temp password, isPasswordSet = false

Day 0 - 10:05 AM
├─ Corporate Admin: Clicks "Send Invitations"
├─ Backend: Generates 7-day token, sends email
└─ Employee: Receives email with "Set Your Password" link

Day 0 - 10:15 AM
├─ Employee: Clicks link in email
├─ Browser: Navigates to /set-password?token=xyz...
├─ Frontend: Validates token, shows form
└─ Employee: Enters new password

Day 0 - 10:20 AM
├─ Employee: Clicks "Set Password & Login"
├─ Backend: Updates user (password, isPasswordSet = true)
├─ Backend: Returns JWT token
├─ Frontend: Auto-login, redirects to dashboard
└─ Employee: Can now access employee dashboard

Day 0 onwards
├─ Employee: Can login anytime with email + password
├─ Employee: Can book/track corporate rides
└─ Employee: Can access all features
```

---

## Why This Design?

### ✅ **Security**
- No passwords sent via email
- Each employee sets their own password
- Token-based (unique, time-limited, single-use)
- Random temporary password = cannot guess login

### ✅ **User Experience**
- Employee doesn't need to remember a temp password
- Clear, simple setup process
- Only 2 steps: click link → set password

### ✅ **Scalability**
- Works for bulk invitations
- Supports 7-day grace period
- Token cleanup automatic

### ✅ **Compliance**
- GDPR-friendly (no plaintext passwords in email)
- Audit trail: token generation logged
- Employee controls their own password

---

## Frontend Route Setup

The `/set-password` route is configured in `App.jsx`:
```jsx
<Route
  path="/set-password"
  element={
    <PublicRoute>
      <SetPassword />
    </PublicRoute>
  }
/>
```

- ✅ Accessible to unauthenticated users (via token)
- ✅ Component: `frontend/src/Pages/SetPassword/SetPassword.jsx`
- ✅ Handles token validation and password setup

---

## Testing the Flow

### Manual Test:
1. Go to `/corporate/employee-management`
2. Add employee: "test@example.com"
3. Select employee → "Send Invitations"
4. Check email inbox (use test email account)
5. Click "Set Your Password" link
6. Set password (e.g., "password123")
7. Auto-redirected to dashboard
8. Logout and login with email + password ✅

---

## Environment Variables Needed

Ensure these are set in `.env`:
- `FRONTEND_URL`: Frontend URL for invitation links (e.g., https://app.example.com)
- `EMAIL_HOST`: SMTP server (e.g., smtp.gmail.com)
- `EMAIL_PORT`: SMTP port (e.g., 587)
- `EMAIL_USER`: Email account for sending (e.g., noreply@company.com)
- `EMAIL_PASS`: Email password/app password
- `EMAIL_FROM`: Display name (e.g., "DriveMe <noreply@driveme.com>")
- `JWT_SECRET`: Secret for token generation
- `JWT_EXPIRE`: Token expiry (e.g., "7d")

---

## Common Questions

**Q: Why not send password in email?**
A: Security risk. Passwords in emails can be intercepted. The token-based approach is industry standard (Slack, GitHub, etc.).

**Q: What if employee loses the email?**
A: Corporate admin can resend invitation → new token generated.

**Q: Can an employee set password multiple times?**
A: No, once password is set, token is cleared. They must login normally afterward.

**Q: What happens after 7 days?**
A: Token expires. Employee cannot use the link. Corporate admin resends invitation.

**Q: Can employee login before setting password?**
A: No, temp password is random and never shared. They must use the invitation link.

---

## Summary

The system is **fully functional and secure**. Employee invitation flow:

1. Admin creates employee → No password needed
2. Admin sends invitation → Email with token link
3. Employee sets password → Via `/set-password` page
4. Employee auto-logged in → Redirected to dashboard
5. Employee can login anytime → With email + password

**No manual password sharing required!** ✅
