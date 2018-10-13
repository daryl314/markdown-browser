FROM buildpack-deps:18.04
RUN apt-get update

# time zone data
RUN echo 'US/Eastern' > /etc/timezone \
  && ln -s /usr/share/zoneinfo/US/Eastern /etc/localtime \
  && apt-get install -y tzdata

# node.js
RUN curl -sL https://deb.nodesource.com/setup_8.x | bash -
RUN apt-get install -y nodejs

# install pandoc with latex support
RUN apt-get install -y \
  pandoc \
  texlive-latex-base \
  texlive-fonts-recommended \
  texlive-fonts-extra \
  texlive-latex-extra

