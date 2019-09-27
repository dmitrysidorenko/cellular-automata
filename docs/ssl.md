# SSL on localhost

## Generate an ssl certificate

To create the certificate you must have OpenSSL installed on your system.

You may have it installed already, just try typing openssl in your terminal.

If not, on a Mac you can install it using brew install openssl (if you use Homebrew).

Make a folder `ssl` in the root folder

```
$ mkdir ssl
```

### Run script to generate a certificate:

```
$ openssl req -nodes -new -x509 -keyout ./ssl/server.key -out ./ssl/server.cert
```
or
```
$ yarn generate:ssl
```


## Build the app

```
$ yarn build
```

## Start local server

> Make sure `serve` is installed:

```
$ yarn global add serve
```

### Serve the build

```
$ serve --ssl-cert ./ssl/server.cert --ssl-key ./ssl/server.key -s ./build
```
or
```
yarn serve
```

## Trouble-shooting

> DOMException: Failed to register a ServiceWorker: An SSL certificate error occurred when fetching the script

To make chrome trust our self signed certificate, run it with a special flags

```
$ /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --user-data-dir=/tmp/foo --ignore-certificate-errors --unsafely-treat-insecure-origin-as-secure=https://localhost:5000
```

See https://deanhume.com/testing-service-workers-locally-with-self-signed-certificates/