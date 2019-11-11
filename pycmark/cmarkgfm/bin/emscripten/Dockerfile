FROM buildpack-deps:18.04

RUN cd ~ \
    && git clone https://github.com/emscripten-core/emsdk.git \
    && cd ~/emsdk/ \
    && ./emsdk install latest \
    && ./emsdk activate latest \
    && echo "source $HOME/emsdk/emsdk_env.sh" > /root/.bash_profile
