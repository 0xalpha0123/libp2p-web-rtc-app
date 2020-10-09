FROM node:12

WORKDIR /opt/app

ENV PATH /opt/app/node_modules/.bin:$PATH

COPY package.json ./

COPY yarn.lock ./

RUN yarn

COPY . ./

CMD ["yarn", "watch"]