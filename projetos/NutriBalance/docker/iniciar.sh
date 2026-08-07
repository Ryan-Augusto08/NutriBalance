#!/bin/sh
# Alinha a porta do Apache com a que a hospedagem escolheu.
#
# O Railway sorteia uma porta a cada deploy e a entrega na variavel $PORT; a
# imagem do Apache vem fixa na 80. Sem esta troca o container sobe, o log nao
# mostra erro nenhum, e mesmo assim nada responde — a hospedagem bate numa
# porta onde nao ha ninguem escutando.

set -e

PORTA="${PORT:-80}"

sed -i "s/^Listen 80$/Listen ${PORTA}/" /etc/apache2/ports.conf
sed -i "s/<VirtualHost \*:80>/<VirtualHost *:${PORTA}>/" /etc/apache2/sites-available/000-default.conf

# exec substitui o shell pelo Apache: assim o Apache vira o processo principal
# do container e recebe direto o sinal de parada na hora do deploy novo.
exec apache2-foreground
