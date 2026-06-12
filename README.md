# 🎫 DevSecOps Ticket Management System

A simple, modern ticket management tool for handling device requests and issue reports with manager approval workflow.

## Features

✅ **Device Requests** - Request new devices (laptops, monitors, phones, etc.)  
✅ **Issue Reporting** - Report and track system/software issues  
✅ **Manager Approval** - Simple approval workflow for requests  
✅ **Status Tracking** - Follow ticket status from creation to closure  
✅ **Priority Levels** - Prioritize tickets as low, medium, or high  
✅ **Responsive UI** - Clean, modern interface that works on all devices  
✅ **Docker Compose** - Easy deployment with Docker

## Project Structure

```
ticket-management/
├── docker-compose.yml          # Docker Compose configuration
├── backend/
│   ├── server.js              # Express API server
│   ├── package.json           # Node dependencies
│   ├── Dockerfile             # Backend Docker image
│   └── data/                  # SQLite database storage
└── frontend/
    ├── src/
    │   ├── App.js             # Main React component
    │   ├── App.css            # App styling
    │   └── components/
    │       ├── TicketList.js       # Display all tickets
    │       ├── CreateTicket.js     # Create new ticket form
    │       ├── TicketDetail.js     # View & approve tickets
    │       └── ApprovalQueue.js    # Manager approval dashboard
    ├── public/
    │   └── index.html         # HTML template
    ├── package.json           # React dependencies
    └── Dockerfile             # Frontend Docker image
```

## Tech Stack

**Backend:**
- Node.js 18
- Express.js
- SQLite3
- CORS support

**Frontend:**
- React 18
- Axios for API calls
- Custom CSS (no external UI libraries)

## Quick Start

### Prerequisites
- Docker
- Docker Compose

### Installation & Running

1. **Clone/Extract the project**
   ```bash
   cd ticket-management
   ```

2. **Start with Docker Compose**
   ```bash
   docker-compose up --build
   ```

   This will:
   - Build backend Docker image
   - Build frontend Docker image
   - Start both containers
   - Create SQLite database automatically

3. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000/api

4. **Stop the application**
   ```bash
   docker-compose down
   ```

## Default Users

The system comes with sample users for testing:

| Name | Email | Role |
|------|-------|------|
| John Doe | john@company.com | Employee |
| Jane Smith | jane@company.com | Manager |
| Bob Wilson | bob@company.com | Employee |
| Manager One | manager@company.com | Manager |

You can switch between users using the dropdown in the top-right corner.

## Usage Guide

### For Employees

1. **Create a Ticket**
   - Click "Create Ticket" in the sidebar
   - Select ticket type (Device Request or Issue Report)
   - Fill in title and description
   - Choose category and priority
   - Submit and wait for manager approval

2. **View Your Tickets**
   - Go to Dashboard to see all tickets
   - Click on any ticket to view details
   - Check approval status

3. **Close Approved Tickets**
   - Once approved by manager, you can close the ticket
   - This marks the ticket as completed

### For Managers

1. **Review Pending Requests**
   - Click "Approvals" in the sidebar (only visible for managers)
   - See all pending tickets
   - Click on a ticket to review details

2. **Approve or Reject**
   - Click the ticket to open details
   - Add approval comment
   - Click "Approve" or "Reject"
   - Changes are saved immediately

3. **Track Status**
   - Dashboard shows all tickets with their current status
   - Filter by status, priority, or type as needed

## API Endpoints

### Tickets
- `GET /api/tickets` - Get all tickets
- `GET /api/tickets/:id` - Get specific ticket
- `GET /api/tickets/user/:userId` - Get user's tickets
- `GET /api/tickets/pending/approvals` - Get pending approvals
- `POST /api/tickets` - Create new ticket
- `PUT /api/tickets/:id/approve` - Approve ticket
- `PUT /api/tickets/:id/reject` - Reject ticket
- `PUT /api/tickets/:id/close` - Close ticket

### Users
- `GET /api/users` - Get all users
- `GET /api/me` - Get current user

## Ticket Workflow

```
Create Ticket (Pending)
        ↓
    Manager Reviews
        ↓
    ├─→ Approve → Requester Closes → Closed
    └─→ Reject  → Requester Creates New
```

## Database Schema

### Users Table
- `id` - Unique identifier
- `name` - User name
- `email` - Email address
- `role` - employee or manager

### Tickets Table
- `id` - Ticket ID
- `title` - Ticket title
- `description` - Detailed description
- `type` - device-request or issue
- `category` - Specific category
- `priority` - low, medium, high
- `status` - pending, approved, rejected, closed
- `requester_id` - Who requested
- `approver_id` - Who approved
- `approval_date` - When approved
- `approval_comment` - Approval notes

## Customization

### Add More Users
Edit the database initialization in `backend/server.js` and add more users in the INSERT statement.

### Change Categories
Edit the categories object in `frontend/src/components/CreateTicket.js` to customize available categories.

### Update Styling
Modify CSS files in `frontend/src/` to match your branding:
- `App.css` - Main styles
- `components/*.css` - Component-specific styles

### Change Port Numbers
Edit `docker-compose.yml`:
```yaml
services:
  backend:
    ports:
      - "YOUR_PORT:5000"
  frontend:
    ports:
      - "YOUR_PORT:3000"
```

## Troubleshooting

### Port Already in Use
If ports 3000 or 5000 are already in use:
```bash
# Change in docker-compose.yml
ports:
  - "8000:3000"  # Maps external 8000 to container 3000
```

### Database Issues
Delete the data directory and restart:
```bash
rm -rf backend/data/
docker-compose down
docker-compose up --build
```

### API Connection Issues
Ensure both containers are running:
```bash
docker-compose ps
```

Check logs:
```bash
docker-compose logs backend
docker-compose logs frontend
```

## Future Enhancements

- [ ] User authentication & JWT tokens
- [ ] Email notifications for approvals
- [ ] Ticket search and advanced filtering
- [ ] Admin dashboard with analytics
- [ ] Bulk approval/rejection
- [ ] Ticket reassignment
- [ ] Comment/discussion threads
- [ ] File attachments
- [ ] Escalation after timeout
- [ ] Database migration to PostgreSQL

## License

This project is open source and available for educational and commercial use.

## Support

For issues or questions, please create an issue in the project repository.
