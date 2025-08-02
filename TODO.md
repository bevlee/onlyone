# TODO - DockerHub Migration

## Phase 1: Multi-stage Frontend Build Strategy

### Frontend Image Build

- [x] Create standalone frontend build image
  - [x] Build frontend with all static assets
  - [x] Export build artifacts to `/app/build`
  - [x] Tag as intermediate build image
  - [x] Test local build produces static files

### Nginx Image with Frontend Assets

- [x] Update nginx Dockerfile to use frontend build image
  - [x] Remove broken `--from=onlyone-frontend` reference
  - [x] Test nginx serves static files correctly
  - [ ] Verify WebSocket proxy still works

## 🚀 Phase 2: DockerHub Image Publishing Strategy

### Image Registry Architecture
- [ ] Design multi-service image strategy
  - [ ] Plan image naming convention for `bevdev1/onlyone-*` repositories
  - [ ] CI-only semantic versioning strategy (v1.2.3)
  - [ ] Coordinated version releases across all services

### Distribution Pipeline Design  
- [ ] Design build and deployment workflow
  - [ ] Local development: build from source (no registry pulls)
  - [ ] Production deployment: semver-tagged images only via CI/CD
  - [ ] Git tag → CI trigger → Docker semver workflow
  - [ ] Version coordination strategy across frontend/gameserver/nginx

### Semantic Versioning Workflow
- [ ] **Git Tag Strategy**
  - [ ] Define semver format (v1.2.3) for releases
  - [ ] Create git tag validation rules
  - [ ] Document release process (tag → CI → deploy)
  - [ ] Set up automated changelog generation

- [ ] **CI/CD Semver Integration**
  - [ ] Modify GitHub Actions to trigger only on git tags
  - [ ] Add semver parsing from git tags to Docker tags
  - [ ] Update `latest` tag automatically on stable releases
  - [ ] Registry authentication and security model

### Version Coordination
- [ ] **Multi-Service Versioning**
  - [ ] Ensure frontend/gameserver/nginx versions stay aligned
  - [ ] Create version compatibility matrix
  - [ ] Add version validation in nginx Dockerfile
  - [ ] Test cross-service version compatibility

- [ ] **Release Management**
  - [ ] Image update and rollback strategies
  - [ ] Multi-environment configuration management
  - [ ] Integration with existing GitHub Actions workflow
  - [ ] Production deployment validation

## 🧪 Phase 3: Local Integration Testing Framework

### Frontend Integration Testing
- [ ] **Static Asset Integration**
  - [ ] Verify frontend builds produce correct static files
  - [ ] Test asset serving through nginx proxy
  - [ ] Validate SPA routing and fallback behavior
  - [ ] Check frontend environment variable injection

- [ ] **Socket.IO Client Integration**
  - [ ] Test WebSocket connection establishment
  - [ ] Verify Socket.IO client can connect through nginx proxy
  - [ ] Test connection recovery and reconnection logic
  - [ ] Validate client-side event handling

### Nginx Proxy Integration Testing
- [ ] **Reverse Proxy Functionality**
  - [ ] Test static file serving from frontend build artifacts
  - [ ] Verify WebSocket upgrade handling for `/socket.io/*`
  - [ ] Test SSL/TLS termination and certificate handling
  - [ ] Validate proxy headers and request forwarding

- [ ] **Service Discovery Integration**
  - [ ] Test nginx → gameserver internal networking
  - [ ] Verify environment-based configuration templating
  - [ ] Test health check endpoint functionality
  - [ ] Validate gzip compression and caching headers

### Gameserver Integration Testing
- [ ] **Socket.IO Server Integration**
  - [ ] Test WebSocket server accepts connections through proxy
  - [ ] Verify room-based connection management
  - [ ] Test real-time event broadcasting to multiple clients
  - [ ] Validate game state synchronization across connections

- [ ] **Multi-Service Communication**
  - [ ] Test gameserver responds to proxied requests
  - [ ] Verify internal Docker networking connectivity
  - [ ] Test environment variable configuration
  - [ ] Validate logging and error handling integration

### Full-Stack Integration Testing
- [ ] **Complete Game Flow Integration**
  - [ ] Test end-to-end game creation and joining
  - [ ] Verify category selection across multiple clients
  - [ ] Test clue writing and submission workflow
  - [ ] Validate voting and filtering functionality
  - [ ] Test word guessing and scoring integration

- [ ] **Multi-Player Scenarios**
  - [ ] Test multiple browser sessions in same room
  - [ ] Verify player connection/disconnection handling
  - [ ] Test concurrent game state updates
  - [ ] Validate room isolation between different games

### Integration Test Automation
- [ ] **Local Testing Scripts**
  - [ ] Create `scripts/test-integration.sh` for full stack testing
  - [ ] Add `scripts/start-test-env.sh` for quick environment setup
  - [ ] Create health check validation scripts
  - [ ] Add container log aggregation for debugging

- [ ] **Docker Compose Test Configuration**
  - [ ] Create `docker-compose.test.yml` for integration testing
  - [ ] Add test-specific environment configurations
  - [ ] Set up test data seeding and cleanup
  - [ ] Configure test-friendly logging and monitoring

## 🔒 Phase 4: Remove HTTPS Configuration

### Frontend HTTPS Removal
- [ ] Remove HTTPS cert config from front/vite.config.ts
  - [ ] Remove cert file checks and loading
  - [ ] Simplify server configuration to HTTP only
  - [ ] Update any hardcoded HTTPS URLs

### Backend Communication
- [ ] Change frontend-backend communication from HTTPS to HTTP
  - [ ] Update API endpoints to use HTTP
  - [ ] Modify WebSocket connections to use WS instead of WSS
  - [ ] Update environment variables and configuration

### Docker Configuration
- [ ] Remove port 443 and cert references from Dockerfiles
  - [ ] Update nginx configuration to serve HTTP only
  - [ ] Remove SSL/TLS configuration from nginx.conf
  - [ ] Update exposed ports in docker-compose files

### Testing Updates
- [ ] Update testing to not rely on HTTPS
  - [ ] Modify integration tests to use HTTP endpoints
  - [ ] Update test configurations and fixtures
  - [ ] Ensure all test scripts work with HTTP
