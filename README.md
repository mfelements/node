This is a repository for launching your own node to support MFElements project. 

#### Prerequisites:

* [Docker](https://www.docker.com/)
* [docker-compose](https://docs.docker.com/compose/)
* Docker is added to autostart as a service
* Public static IP

#### Supported architectures:

* x86
* x86_64
* armv7
* armv8
* ppc64le
* s390x

#### Prepare the node:

1. Clone repository to your services directory and enter it
1. Change the owner of `data/daemon` directory <pre>$ chown 405:0 data/daemon</pre>

#### Add to autostart

##### Systemd

Create file named `/etc/systemd/system/mfc-node.service` with following contents (change `/path/to/services` to your services folder):

```
[Unit]
Description=MFCoin node
Requires=docker.service
After=docker.service

[Service]
Restart=always
WorkingDirectory=/path/to/services/mfc-node
ExecStart=/usr/local/bin/docker-compose up
ExecStop=/usr/local/bin/docker-compose down

[Install]
WantedBy=multi-user.target
```

Now enable the service:

```
# systemctl enable --now mfc-node
```

##### OpenRC

Create the file `/etc/init.d/dockerservice` with next contents (change `/path/to/services` to your services folder):

```
#!/sbin/openrc-run

: ${SUBCFGDIR:=/path/to/services}

SUBSVC="${SVCNAME#*.}"
[ -z "${SUBSVC}" ] && exit 1
: ${SUBCFG:="${SUBCFGDIR}/${SUBSVC}/docker-compose.yml"}
DOCOCMD="/usr/bin/docker-compose"
export COMPOSE_HTTP_TIMEOUT=300

depend() {
  need localmount net docker
  use dns
  after docker
}

configtest() {
  if ! [ -f "${SUBCFG}" ]; then
    eerror "The config file ${SUBCFG} does not exist!"
    return 1
  fi
  if "${DOCOCMD}" -f "${SUBCFG}" config >&/dev/null; then
    einfo "config: ok"
  else
    eerror "config: error"
    return 1
  fi
}

start() {
  configtest || return 1
  ebegin "Starting dockerservice ${SUBSVC}"
  "${DOCOCMD}" -f "${SUBCFG}" up -d ${DOCKER_COMPOSE_UP_ARGS}
  eend $?
}

stop() {
  ebegin "Stopping dockerservice ${SUBSVC}"
  "${DOCOCMD}" -f "${SUBCFG}" stop --timeout=300
  eend $?
}

status() {
  if [ "$("${DOCOCMD}" -f "${SUBCFG}" top | wc -l)" -gt "0" ]; then
    einfo "status: started"
  else
    einfo "status: stopped"
    return 3
  fi
}
```

Create some symbolic link `/etc/init.d/dockerservice.mfc-node` pointing to `/etc/init.d/dockerservice`:

```
# ln -s /etc/init.d/dockerservice /etc/init.d/dockerservice.mfc-node
```

Finally, start the service and add it to autostart:

```
# rc-service dockerservice.mfc-node start
# rc-update add dockerservice.mfc-node
```
