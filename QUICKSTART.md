# 🚀 Quick Start Guide

## One-Command Start

```bash
docker-compose up --build
```

Wait for both containers to start, then open:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api/tickets

## What's Included

✅ Full-stack ticket management system
✅ Device request tracking
✅ Issue reporting system
✅ Manager approval workflow
✅ SQLite database (auto-initialized)
✅ Responsive React UI
✅ RESTful API backend

## Test the Application

### Step 1: Switch to Manager Account
- Dropdown in top-right: Select "Jane Smith (Manager)" or "Manager One (Manager)"

### Step 2: Create a Ticket as Employee
- Switch to "John Doe" or "Bob Wilson"
- Click "Create Ticket"
- Fill in the form and submit

### Step 3: Review Approval as Manager
- Switch back to "Jane Smith" or "Manager One"
- Click "Approvals" tab
- Click any ticket to review
- Add comment and approve/reject

### Step 4: Complete the Workflow
- Switch back to the requestor
- If approved, you can now close the ticket
- View ticket status in Dashboard

## File Structure

```
.
├── docker-compose.yml          # Start everything with one command
├── README.md                   # Full documentation
├── .gitignore                 # Git configuration
│
├── backend/                   # Node.js Express API
│   ├── server.js             # Main API server
│   ├── package.json          # Dependencies
│   ├── Dockerfile            # Docker image
│   ├── .dockerignore         # Docker build exclusions
│   └── data/                 # SQLite database (created automatically)
│
└── frontend/                  # React application
    ├── src/
    │   ├── App.js            # Main component
    │   ├── App.css           # Global styles
    │   ├── index.js          # React entry point
    │   └── components/
    │       ├── TicketList.js
    │       ├── CreateTicket.js
    │       ├── TicketDetail.js
    │       ├── ApprovalQueue.js
    │       └── [component styles]
    ├── public/
    │   └── index.html        # HTML template
    ├── package.json          # Dependencies
    ├── Dockerfile            # Docker image
    └── .dockerignore         # Docker build exclusions
```

## Common Commands

```bash
# Start the application
docker-compose up --build

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop the application
docker-compose down

# Remove all containers and volumes (including database)
docker-compose down -v

# Restart services
docker-compose restart

# Check running containers
docker-compose ps
```

## API Examples

Create a ticket:
```bash
curl -X POST http://localhost:5000/api/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Need a laptop",
    "description": "Need MacBook Pro for development",
    "type": "device-request",
    "category": "Laptop",
    "priority": "high",
    "requester_id": "user1",
    "requester_name": "John Doe",
    "requester_email": "john@company.com"
  }'
```

Get all tickets:
```bash
curl http://localhost:5000/api/tickets
```

Approve a ticket:
```bash
curl -X PUT http://localhost:5000/api/tickets/TICKET_ID/approve \
  -H "Content-Type: application/json" \
  -d '{
    "approver_id": "user2",
    "approver_name": "Jane Smith",
    "approval_comment": "Approved"
  }'
```

## Troubleshooting

**Port 3000 or 5000 already in use?**
Edit docker-compose.yml and change the port mapping:
```yaml
frontend:
  ports:
    - "8080:3000"  # Access at http://localhost:8080
backend:
  ports:
    - "5001:5000"  # API at http://localhost:5001
```

**Database corrupted or need fresh start?**
```bash
docker-compose down -v
rm -rf backend/data/
docker-compose up --build
```

**Can't connect to backend from frontend?**
- Ensure docker-compose is using the internal network
- Check that both containers are running: `docker-compose ps`
- Check logs: `docker-compose logs backend`

**Need to rebuild without cache?**
```bash
docker-compose build --no-cache
docker-compose up
```

## Next Steps

1. ✅ Customize categories in `CreateTicket.js`
2. ✅ Add more default users in `backend/server.js`
3. ✅ Modify color scheme in CSS files
4. ✅ Deploy to production (AWS, DigitalOcean, etc.)
5. ✅ Add authentication and JWT tokens
6. ✅ Set up email notifications

See README.md for full documentation and future enhancement ideas!
