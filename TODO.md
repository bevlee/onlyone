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
  - [x] Use `COPY --from=bevdev1/onlyone-frontend:latest /app/build /usr/share/nginx/html`
  - [x] Remove broken `--from=onlyone-frontend` reference
  - [x] Test nginx serves static files correctly
  - [ ] Verify WebSocket proxy still works

## Phase 2: DockerHub Image Publishing

### Image Registry Architecture

- [ ] Design multi-service image strategy
  - [ ] Plan image naming convention for `bevdev1/onlyone-*` repositories
  - [ ] Define tagging strategy (latest, semantic versioning, git-based)
  - [ ] Consider image dependencies and build order
  - [ ] Plan for development vs production image variants

### Distribution Pipeline Design

- [ ] Design build and deployment workflow
  - [ ] Local development: build from source vs pull from registry
  - [ ] Production deployment: registry-only approach
  - [ ] Image update and rollback strategies
  - [ ] Multi-environment configuration management

### Automation Strategy

- [ ] Plan CI/CD integration approach
  - [ ] Automated builds on code changes vs manual releases
  - [ ] Multi-architecture build considerations (AMD64/ARM64)
  - [ ] Registry authentication and security model
  - [ ] Integration with existing GitHub Actions workflow
