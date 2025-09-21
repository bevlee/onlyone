 #!/bin/bash
echo 'Waiting for NATS to be ready...'
until nc -z nats 4222; do sleep 1; done
  echo 'Creating stream GAME_EVENTS...'
  nats --server nats://nats:4222 stream add GAME_EVENTS \
    --subjects 'game.events.*' \
    --storage file \
    --retention limits \
    --max-age 90d \
    --max-msgs 100000 \
    --discard old \
    --defaults  || echo 'Stream already exists or config differs'

echo 'Init complete.'