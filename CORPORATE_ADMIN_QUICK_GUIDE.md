# Corporate Admin - Employee Management Quick Guide

## 🎯 Your Role: Add & Invite Employees

As a CORPORATE admin, your job is to:
1. **Add employee details** (name, email, department, etc.)
2. **Send invitation emails** to let them set their own password
3. **Track employee roster** and manage access

---

## 📋 Step-by-Step: Add Employee & Send Invitation

### STEP 1: Navigate to Employee Management
```
📍 URL: https://yourapp.com/corporate/employee-management
or from Dashboard → Menu → "Employee Management"
```

### STEP 2: Click "+ Add Employee"
```
Location: Top-right of "Employee List" section
Action: Click the "+ Add Employee" button
```

### STEP 3: Fill Employee Details
```
📝 Form Fields:

PERSONAL INFORMATION:
├─ First Name *
├─ Last Name *
├─ Email * (their company email, e.g., john.doe@company.com)
├─ Phone Number
├─ Department (e.g., "IT", "Sales")
└─ Designation (e.g., "Software Engineer")

RESIDENTIAL ADDRESS:
├─ Street
├─ Area
├─ City
├─ State
└─ Postal Code

TRANSPORT DETAILS:
├─ Assigned Route (select from list)
├─ Pickup Point
├─ Drop-off Point
└─ Shift Type (FULL_DAY, HALF_DAY, etc.)

⭐ IMPORTANT: 
- Use their ACTUAL EMAIL (they'll receive invitation there)
- No password needed (they'll set it via email link)
```

### STEP 4: Click "Add Employee"
```
Action: Click "Add Employee" button
Result: Employee added to list with status "Active"
        (Invitation not yet sent)
```

### STEP 5: Send Invitation Email
```
Location: Employee List table

Actions:
1. Find the employee in the table
2. Click checkbox next to their name (or use "Select All")
3. Click "Send Invitations" button (appears when employees selected)
4. Confirm when prompted

Result: ✅ Invitation email sent to employee's email
        Button changes to "Sending..."
        Shows success message
```

---

## 📧 What Employee Receives

**Email Subject:**
```
You are invited to join Corporate Transport - DriveMe
```

**Email Contains:**
```
✅ Welcome message with their name
✅ Their email and Employee ID
✅ Their Department
✅ BLUE BUTTON: "Set Your Password"
✅ Fallback link if button doesn't work
✅ Message: "Link expires in 7 days"
```

---

## 🔐 What Happens Next (Employee's Journey)

```
Timeline:

1️⃣ Employee receives email
   ↓
2️⃣ Employee clicks "Set Your Password" button
   ↓
3️⃣ Browser opens: /set-password?token=xyz...
   ↓
4️⃣ Page shows: "Welcome, John Doe"
   ↓
5️⃣ Employee enters password (min 6 characters)
   ↓
6️⃣ Employee confirms password (must match)
   ↓
7️⃣ Clicks "Set Password & Login"
   ↓
8️⃣ ✅ Auto-logged in (no second login needed!)
   ↓
9️⃣ Redirected to CORPORATE_EMPLOYEE dashboard
   ↓
🔟 Can now:
   • Book corporate rides
   • View assigned route
   • Check schedule
   • Use all employee features
```

---

## 📱 After Employee Sets Password

**What Can They Do?**
- ✅ Login anytime at `/login` with email + password
- ✅ Book corporate rides
- ✅ View assigned route and timings
- ✅ Track vehicle location
- ✅ View travel history
- ✅ Update profile

**Admin Options:**
- ✅ Resend invitation (if employee lost the email)
- ✅ Update employee details (route, department, etc.)
- ✅ Deactivate employee (they can't login anymore)
- ✅ Delete employee (removes from system)

---

## 🔄 Bulk Upload Option

Instead of adding one employee at a time:

### STEP 1: Click "Bulk Upload"
```
Location: Top-right, "Bulk Upload" button
```

### STEP 2: Download Template
```
Action: Click "Download Template" button
        Saves: employee_template.json

File Contains:
[
  {
    "fullName": "John Doe",
    "email": "john@company.com",
    "contactNumber": "+1234567890",
    "department": "IT",
    "designation": "Software Engineer",
    "workLocation": "Main Office",
    "residentialAddress": {
      "street": "123 Main St",
      "area": "Downtown",
      "city": "New York",
      "state": "NY",
      "postalCode": "10001"
    },
    "routeId": "",
    "pickupLocation": "",
    "dropoffLocation": "",
    "workShift": "FULL_DAY"
  }
]
```

### STEP 3: Edit Template
```
1. Open the JSON file in a text editor
2. Add/edit employee details
3. Save the file
```

### STEP 4: Upload File
```
Action: In the modal, click "Choose File"
        Select your edited JSON file
        Click "Upload"

Result: All employees added at once
```

### STEP 5: Send Invitations to All
```
Action: In the employee list, select all newly added employees
        Click "Send Invitations"
        All get invitation emails
```

---

## ⚠️ Important Points

| Point | What To Do |
|-------|-----------|
| **Employee didn't receive email** | Check spam folder. If missing, resend invitation. |
| **Employee lost the invitation link** | Resend invitation from employee list. |
| **Employee forgot their password** | They can use "Forgot Password" on login page. |
| **Employee wants to change email** | Edit employee details and update. |
| **Employee left company** | Click "Delete" or "Deactivate" in employee list. |
| **Link expired (7+ days passed)** | Resend invitation to generate new link. |

---

## 🎯 Best Practices

### ✅ DO:
- Use employee's **actual company email** (they need to receive invitation)
- **Assign routes and transport details** when adding employee
- **Send invitation promptly** so employee doesn't forget
- **Keep employee list updated** with current information
- **Archive/deactivate** employees who leave company

### ❌ DON'T:
- Don't manually set passwords (employees set their own via email)
- Don't send passwords via separate email (security risk)
- Don't delay sending invitations (employee might need the service)
- Don't use personal emails (use company email for company account)
- Don't forget to assign routes (employee needs to know their pickup point)

---

## 🔗 Related Information

- **For Employees:** See `CORPORATE_EMPLOYEE_INVITATION_FLOW.md`
- **Technical Details:** See `EMPLOYEE_LOGIN_FIX_EXPLANATION.md`
- **Application Flow:** See `COMPLETE_APPLICATION_FLOW.md`

---

## 📞 Troubleshooting

### Q: Why don't I send the password via email?
**A:** Security best practice. Passwords in emails can be intercepted. Token-based invitation is much safer.

### Q: Can employee login before setting password?
**A:** No. They receive a random temporary password that's never shared. They MUST use the invitation link to set a real password.

### Q: What if employee clicks "Add Employee" but forgets to send invitation?
**A:** Employee won't receive anything. Go back to list and click "Send Invitations" for that employee.

### Q: How long does the invitation link work?
**A:** 7 days. After that, employee must request a new invitation.

### Q: Can I change employee details after adding them?
**A:** Yes. Click the employee in the list → "Edit" or "View" → Update details.

### Q: What happens when employee sets password?
**A:** They're automatically logged in and redirected to their dashboard. No second login needed.

---

## 📊 Status Reference

**Employee Status Meanings:**
| Status | Meaning |
|--------|---------|
| **Active** | Employee can login and use the app |
| **Inactive** | Employee cannot login (deactivated by admin) |
| **Pending** | Added but invitation not yet sent |
| **Verified** | Password set and email verified |

---

## 🎉 Summary

Your Job: **Add employees → Send invitations → They set passwords**

That's it! The system handles the rest securely.

No need to:
- ❌ Generate passwords
- ❌ Send passwords via email
- ❌ Help employees remember temporary passwords
- ❌ Force password changes

Just:
- ✅ Add employee details
- ✅ Send invitation
- ✅ They set their own password
- ✅ Done!

Simple, secure, and user-friendly. 🚀
