FROM alpine:3.11.5

# Installs latest Chromium (77) package.
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      freetype-dev \
      harfbuzz \
      ca-certificates \
      ttf-freefont \
      nodejs \
      yarn \ 
      tzdata

RUN echo "America/New_York" >  /etc/timezone
ENV TZ=America/New_York

# Tell Puppeteer to skip installing Chrome. We'll be using the installed package.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

# Puppeteer v1.19.0 works with Chromium 77.
RUN yarn add puppeteer@1.19.0

WORKDIR /app
COPY package*.json ./

RUN yarn install

COPY . .

CMD yarn run start